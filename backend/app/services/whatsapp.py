import httpx
from app.core.config import settings


async def send_whatsapp_template_message(
    recipient_phone: str,
    customer_name: str,
    discount_percentage: float,
    coupon_code: str
) -> dict:
    """
    Dispatches a pre-approved template message via Meta WhatsApp Cloud API.
    If no token is set in .env, safely mocks the dispatch for local development.
    """
    # Safe fallback if credentials are not configured yet
    if not settings.WHATSAPP_API_TOKEN or not settings.WHATSAPP_PHONE_NUMBER_ID:
        print("\n" + "=" * 60)
        print("📱 [WHATSAPP DISPATCH MOCK]")
        print(f"To: {recipient_phone} ({customer_name})")
        print(f"Template: customer_winback_v1")
        print(f"Variables: [Name: {customer_name}, Discount: {discount_percentage}%, Code: {coupon_code}]")
        print(f"Rendered Body: Hi {customer_name}! We missed you. Here is {discount_percentage}% off your next purchase using code {coupon_code}.")
        print("=" * 60 + "\n")
        return {"status": "MOCKED_SUCCESS", "message_id": "mock_msg_99999"}

    # Real Meta Cloud API execution
    url = f"https://graph.facebook.com/v21.0/{settings.WHATSAPP_PHONE_NUMBER_ID}/messages"
    headers = {
        "Authorization": f"Bearer {settings.WHATSAPP_API_TOKEN}",
        "Content-Type": "application/json",
    }
    payload = {
        "messaging_product": "whatsapp",
        "to": recipient_phone.replace("+", "").replace(" ", ""),
        "type": "template",
        "template": {
            "name": "customer_winback_v1",
            "language": {"code": "en_US"},
            "components": [
                {
                    "type": "body",
                    "parameters": [
                        {"type": "text", "text": customer_name},
                        {"type": "text", "text": f"{discount_percentage:.0f}%"},
                        {"type": "text", "text": coupon_code}
                    ]
                }
            ]
        }
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(url, headers=headers, json=payload, timeout=10.0)
        response.raise_for_status()
        return response.json()