from pydantic import BaseModel, Field
from langchain_google_genai import ChatGoogleGenerativeAI
from app.core.config import settings


class RetentionOffer(BaseModel):
    discount_percentage: float = Field(
        description="A calculated discount percentage between 5 and 20 based on customer loyalty and inactivity."
    )
    coupon_code: str = Field(
        description="A short, catchy coupon code (e.g. SAVE15, COMEBACK10)."
    )
    reasoning: str = Field(
        description="Commercial rationale explaining why this discount was chosen for this customer."
    )


async def generate_guardrailed_offer(customer_name: str, days_inactive: int, total_spend: float) -> RetentionOffer:
    llm = ChatGoogleGenerativeAI(
        model="gemini-3.6-flash",
        google_api_key=settings.GEMINI_API_KEY,
        temperature=0.2
    )

    # Force the model to output strict structured JSON matching our Pydantic schema
    structured_llm = llm.with_structured_output(RetentionOffer)

    prompt = f"""
    You are an automated merchant retention strategist.
    Generate a targeted promotional offer for an inactive customer.

    Customer Details:
    - Name: {customer_name}
    - Inactive Days: {days_inactive} days
    - Lifetime Spend: ₹{total_spend}

    Business Guardrails:
    - Minimum discount: 5%
    - Maximum discount allowed: {settings.MAX_DISCOUNT_THRESHOLD}%
    - Output strictly formatted structured data.
    """

    offer: RetentionOffer = await structured_llm.ainvoke(prompt)

    # Programmatic financial safety guardrail
    if offer.discount_percentage > settings.MAX_DISCOUNT_THRESHOLD:
        offer.discount_percentage = settings.MAX_DISCOUNT_THRESHOLD

    if offer.discount_percentage < 5.0:
        offer.discount_percentage = 5.0

    return offer