from fastapi import APIRouter, HTTPException
from sqlalchemy import text
from app.database.session import AsyncSessionLocal

router = APIRouter(prefix="/merchant", tags=["Merchant Metrics"])

@router.get("/{merchant_id}/stats")
async def get_merchant_stats(merchant_id: int):
    """
    Aggregates campaign data to populate the frontend KPI dashboard cards.
    """
    try:
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                text("""
                    SELECT 
                        COUNT(*) as total_interventions,
                        COUNT(CASE WHEN status = 'APPROVED' THEN 1 END) as approved_count,
                        COUNT(CASE WHEN status = 'REJECTED' THEN 1 END) as rejected_count,
                        COUNT(CASE WHEN status = 'PENDING_APPROVAL' THEN 1 END) as pending_count
                    FROM campaigns
                    WHERE merchant_id = :mid
                """),
                {"mid": merchant_id}
            )
            stats = result.fetchone()

            total = stats.total_interventions or 0
            approved = stats.approved_count or 0
            
            # Calculate Success Rate (Approved / Total decided)
            decided = approved + (stats.rejected_count or 0)
            success_rate = round((approved / decided * 100), 1) if decided > 0 else 0.0

            # Real Customer & Sales metrics
            cust_res = await session.execute(
                text("""
                    SELECT
                        COUNT(*) AS total_customers,
                        COALESCE(SUM(total_spend), 0) AS total_sales,
                        COUNT(CASE WHEN last_visited_at >= NOW() - INTERVAL '30 days' THEN 1 END) AS regular_customers,
                        COUNT(CASE WHEN last_visited_at < NOW() - INTERVAL '30 days' THEN 1 END) AS at_risk_customers
                    FROM customers
                    WHERE merchant_id = :mid
                """),
                {"mid": merchant_id}
            )
            c_row = cust_res.fetchone()

            # Real 6-month graph data
            g = await session.execute(
                text("""
                    SELECT
                        TO_CHAR(DATE_TRUNC('month', last_visited_at), 'Mon') AS month,
                        COUNT(*) AS visits,
                        SUM(total_spend) AS sales
                    FROM customers
                    WHERE merchant_id = :mid
                      AND last_visited_at >= NOW() - INTERVAL '6 months'
                    GROUP BY DATE_TRUNC('month', last_visited_at)
                    ORDER BY DATE_TRUNC('month', last_visited_at)
                """),
                {"mid": merchant_id},
            )
            graph_rows = g.fetchall()

            graph_data = {
                "months": [r.month for r in graph_rows],
                "visits": [int(r.visits) for r in graph_rows],
                "sales": [float(r.sales) for r in graph_rows],
            }

            return {
                "merchant_id": merchant_id,
                "metrics": {
                    "total_interventions": total,
                    "active_pending": stats.pending_count or 0,
                    "approved_campaigns": approved,
                    "success_rate_percentage": success_rate,
                    "total_customers": c_row.total_customers if c_row else 0,
                    "total_sales": float(c_row.total_sales) if c_row else 0.0,
                    "regular_customers": c_row.regular_customers if c_row else 0,
                    "at_risk_customers": c_row.at_risk_customers if c_row else 0,
                },
                "graph_data": graph_data
            }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch merchant stats: {str(e)}")

@router.get("/{merchant_id}/campaigns")
async def get_merchant_campaigns(merchant_id: int):
    try:
        async with AsyncSessionLocal() as session:
            # Added a JOIN to pull the real name from the customers table
            result = await session.execute(
                text("""
                    SELECT c.id, c.thread_id, c.customer_id, cust.name AS customer_name,
                           c.discount_percentage, c.coupon_code, c.template_name, 
                           c.status, c.created_at 
                    FROM campaigns c
                    LEFT JOIN customers cust ON c.customer_id = cust.id
                    WHERE c.merchant_id = :mid 
                    ORDER BY c.created_at DESC 
                    LIMIT 50
                """),
                {"mid": merchant_id}
            )
            
            campaigns = []
            for row in result.fetchall():
                campaigns.append({
                    "id": row.id,
                    "thread_id": row.thread_id,
                    "customer_id": row.customer_id,
                    "customer_name": row.customer_name or f"Customer #{row.customer_id}",
                    "discount_percentage": float(row.discount_percentage) if row.discount_percentage else 0,
                    "coupon_code": row.coupon_code,
                    "status": row.status,
                    "created_at": row.created_at.isoformat() if row.created_at else None
                })
                
            return {"campaigns": campaigns}
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch campaigns: {str(e)}")