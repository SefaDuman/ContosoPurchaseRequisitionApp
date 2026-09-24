import { AsyncBoundary } from '../components/common';
import { PurchaseOrderList } from '../components/OrdersPanel';
import { useAsync } from '../hooks/useAsync';
import type { GoodsReceipt, PurchaseOrder } from '../models';
import { getMyPurchaseOrders, getReceiptsForOrders } from '../services';
import { useAppState } from '../state/AppState';

interface OrdersData {
  orders: PurchaseOrder[];
  receiptsByOrder: Map<string, GoodsReceipt[]>;
}

async function loadOrders(personnelNumber: string): Promise<OrdersData> {
  const orders = await getMyPurchaseOrders(personnelNumber);
  const receiptsByOrder = await getReceiptsForOrders(orders.map((o) => o.purchaseOrderNumber));
  return { orders, receiptsByOrder };
}

/**
 * Orders & receipts: purchase orders generated from the signed-in user's
 * requisitions, with lifecycle tracking and receipt confirmation.
 */
export function OrdersScreen() {
  const { requesterPersonnelNumber, currentWorker, resolvingUser } = useAppState();
  const state = useAsync(() => loadOrders(requesterPersonnelNumber), [requesterPersonnelNumber]);

  const who = currentWorker
    ? `${currentWorker.name} (${currentWorker.personnelNumber})`
    : requesterPersonnelNumber;

  return (
    <div className="page">
      <div className="page-head">
        <h1>Orders &amp; receipts</h1>
        <button className="btn ghost" type="button" onClick={state.reload}>Refresh</button>
      </div>
      {resolvingUser ? (
        <p className="muted">Identifying your worker record…</p>
      ) : (
        <p className="muted">
          Purchase orders created from requisitions prepared by {who}. Confirm receipt of a
          delivery or service milestone and attach the evidence — it is recorded against the order.
        </p>
      )}

      <AsyncBoundary
        loading={state.loading}
        error={state.error}
        data={state.data}
        isEmpty={(d) => d.orders.length === 0}
        emptyTitle="No connected purchase orders yet"
        emptyHint="When your approved requisitions are turned into purchase orders in D365, they appear here."
        onRetry={state.reload}
        loadingLabel="Loading your orders…"
      >
        {(data) => (
          <PurchaseOrderList
            orders={data.orders}
            receiptsByOrder={data.receiptsByOrder}
            onReceiptChanged={state.reload}
          />
        )}
      </AsyncBoundary>
    </div>
  );
}
