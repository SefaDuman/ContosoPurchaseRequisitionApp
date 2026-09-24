import { useState } from 'react';
import { AsyncBoundary, EmptyState } from '../components/common';
import { formatMoney } from '../lib/format';
import { useAsync } from '../hooks/useAsync';
import type { CreateRequisitionInput, RequisitionPurpose } from '../models';
import { createRequisition, getWorkers, getSites, getWarehouses, getOperatingUnits, sendRequisitionApprovalCard, toMessage } from '../services';
import { useAppState } from '../state/AppState';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function CartScreen({ onSubmitted }: { onSubmitted: (requisitionNumber: string) => void }) {
  const {
    cart,
    cartTotal,
    company,
    updateQuantity,
    removeLine,
    clearCart,
    requesterPersonnelNumber,
    setRequesterPersonnelNumber,
  } = useAppState();

  const [name, setName] = useState('');
  const [purpose, setPurpose] = useState<RequisitionPurpose>('Consumption');
  const [justification, setJustification] = useState('');
  const [requestedDate, setRequestedDate] = useState(today());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  const [site, setSite] = useState('');
  const [warehouse, setWarehouse] = useState('');
  const [operatingUnit, setOperatingUnit] = useState('');

  // Reset the dependent site/warehouse selections when the company changes.
  const [prevCompany, setPrevCompany] = useState(company);
  if (company !== prevCompany) {
    setPrevCompany(company);
    setSite('');
    setWarehouse('');
  }

  const workersState = useAsync(() => getWorkers(), []);
  const sitesState = useAsync(() => getSites(company), [company]);
  const warehousesState = useAsync(() => getWarehouses(company, site), [company, site]);
  const operatingUnitsState = useAsync(() => getOperatingUnits(), []);

  const canSubmit =
    cart.length > 0 &&
    name.trim() &&
    justification.trim() &&
    requestedDate &&
    requesterPersonnelNumber &&
    !submitting;

  const submit = async () => {
    setError(undefined);
    setSubmitting(true);
    try {
      const input: CreateRequisitionInput = {
        name: name.trim(),
        purpose,
        businessJustification: justification.trim(),
        requestedDate,
        preparerPersonnelNumber: requesterPersonnelNumber,
        company,
        site: site || undefined,
        warehouse: warehouse || undefined,
        receivingOperatingUnit: operatingUnit || undefined,
        lines: cart,
      };
      const { requisitionNumber } = await createRequisition(input);

      // Fire a demo Teams approval card in the background (never blocks submit).
      const requesterName =
        workersState.data?.find((w) => w.personnelNumber === requesterPersonnelNumber)?.name ??
        requesterPersonnelNumber;
      void sendRequisitionApprovalCard({
        requisitionNumber,
        name: input.name,
        purpose: input.purpose,
        company: input.company,
        requestedDate: input.requestedDate,
        businessJustification: input.businessJustification,
        requesterName,
        total: cartTotal,
        lines: cart.map((l) => ({
          description: l.description,
          quantity: l.quantity,
          unit: l.unit,
          lineTotal: l.indicativePrice * l.quantity,
        })),
      });

      clearCart();
      onSubmitted(requisitionNumber);
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="page">
        <h1>Cart</h1>
        <EmptyState title="Your cart is empty" hint="Add products from the catalog to get started." />
      </div>
    );
  }

  return (
    <div className="page cart-page">
      <h1>Create requisition</h1>

      <div className="cart-grid">
        <section className="cart-lines">
          <h2>Cart lines ({cart.length})</h2>
          <table className="lines-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Category</th>
                <th className="num">Qty</th>
                <th className="num">Indicative price</th>
                <th className="num">Line total</th>
                <th aria-label="Remove" />
              </tr>
            </thead>
            <tbody>
              {cart.map((line) => (
                <tr key={line.id}>
                  <td>
                    <div className="line-desc">{line.description}</div>
                    <div className="muted small">
                      {line.isNonCatalog ? 'Non-catalog' : `#${line.product?.productNumber}`} · {line.unit}
                    </div>
                  </td>
                  <td>{line.categoryName || <span className="muted">—</span>}</td>
                  <td className="num">
                    <input
                      className="qty-input"
                      type="number"
                      min={1}
                      value={line.quantity}
                      onChange={(e) => updateQuantity(line.id, Number(e.target.value) || 1)}
                    />
                  </td>
                  <td className="num">
                    {line.isNonCatalog ? <span className="muted">TBD</span> : formatMoney(line.indicativePrice)}
                  </td>
                  <td className="num">{formatMoney(line.indicativePrice * line.quantity)}</td>
                  <td className="num">
                    <button className="btn ghost small" type="button" onClick={() => removeLine(line.id)}>
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4} className="num strong">Indicative total</td>
                <td className="num strong">{formatMoney(cartTotal)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
          <p className="muted small">
            Prices are indicative. Final pricing is applied by D365 trade agreements when the
            purchase order is created.
          </p>
        </section>

        <aside className="cart-form">
          <h2>Requisition details</h2>

          <label>
            Requisition name
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Q3 office supplies" />
          </label>

          <label>
            Requester
            <AsyncBoundary
              loading={workersState.loading}
              error={workersState.error}
              data={workersState.data}
              isEmpty={(d) => d.length === 0}
              emptyTitle="No workers"
              onRetry={workersState.reload}
              loadingLabel="Loading workers…"
            >
              {(workers) => (
                <select
                  value={requesterPersonnelNumber}
                  onChange={(e) => setRequesterPersonnelNumber(e.target.value)}
                >
                  {/* Preparer must be a current F&O worker, so we only offer real workers. */}
                  {workers.map((w) => (
                    <option key={w.personnelNumber} value={w.personnelNumber}>
                      {w.name} ({w.personnelNumber})
                    </option>
                  ))}
                </select>
              )}
            </AsyncBoundary>
          </label>

          <label>
            Purpose
            <select value={purpose} onChange={(e) => setPurpose(e.target.value as RequisitionPurpose)}>
              <option value="Consumption">Consumption</option>
              <option value="Replenishment">Replenishment</option>
            </select>
          </label>

          <label>
            Requested date
            <input type="date" value={requestedDate} onChange={(e) => setRequestedDate(e.target.value)} />
          </label>

          <label>
            Site
            <select
              value={site}
              onChange={(e) => {
                setSite(e.target.value);
                setWarehouse('');
              }}
              disabled={sitesState.loading}
            >
              <option value="">— Select site —</option>
              {(sitesState.data ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.id}
                </option>
              ))}
            </select>
          </label>

          <label>
            Warehouse
            <select
              value={warehouse}
              onChange={(e) => setWarehouse(e.target.value)}
              disabled={!site || warehousesState.loading}
            >
              <option value="">— Select warehouse —</option>
              {(warehousesState.data ?? []).map((w) => (
                <option key={w.id} value={w.id}>
                  {w.id}
                </option>
              ))}
            </select>
          </label>

          <label>
            Receiving operating unit
            <select
              value={operatingUnit}
              onChange={(e) => setOperatingUnit(e.target.value)}
              disabled={operatingUnitsState.loading}
            >
              <option value="">— Select operating unit —</option>
              {(operatingUnitsState.data ?? []).map((o) => (
                <option key={o.number} value={o.number}>
                  {o.number} — {o.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Business justification
            <textarea
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Why is this purchase needed?"
            />
          </label>

          <div className="muted small">Company: <strong>{company}</strong></div>

          {error && <div className="inline-error" role="alert">{error}</div>}

          <button className="btn primary block" type="button" disabled={!canSubmit} onClick={submit}>
            {submitting ? 'Submitting…' : 'Submit requisition'}
          </button>
        </aside>
      </div>
    </div>
  );
}
