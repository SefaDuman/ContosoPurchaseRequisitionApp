import { useState } from 'react';
import './App.css';
import { CatalogScreen } from './screens/CatalogScreen';
import { CartScreen } from './screens/CartScreen';
import { MyRequisitionsScreen } from './screens/MyRequisitionsScreen';
import { OrdersScreen } from './screens/OrdersScreen';
import { ApprovalsScreen } from './screens/ApprovalsScreen';
import { AssistantDrawer } from './components/AssistantDrawer';
import { useAsync } from './hooks/useAsync';
import { getLegalEntities } from './services';
import { useAppState } from './state/AppState';

type Screen = 'catalog' | 'cart' | 'mine' | 'orders' | 'approvals';

const NAV: { key: Screen; label: string; icon: string; title: string; sub: string }[] = [
  { key: 'catalog', label: 'Catalog', icon: '🛍️', title: 'Catalog', sub: 'Browse products and build a requisition' },
  { key: 'cart', label: 'Cart', icon: '🛒', title: 'Your cart', sub: 'Review lines and submit for approval' },
  { key: 'mine', label: 'My requisitions', icon: '📄', title: 'My requisitions', sub: 'Track the requisitions you have raised' },
  { key: 'orders', label: 'Orders & receipts', icon: '📦', title: 'Orders & receipts', sub: 'Purchase orders and goods receipts' },
  { key: 'approvals', label: 'Approvals', icon: '✅', title: 'Approvals', sub: 'Requisitions waiting on your decision' },
];

function App() {
  const [screen, setScreen] = useState<Screen>('catalog');
  const [flash, setFlash] = useState<string>();
  const { cartCount } = useAppState();

  const active = NAV.find((item) => item.key === screen) ?? NAV[0];

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="brand">
          <span className="brand-logo" aria-hidden="true">☕</span>
          <span className="brand-text">
            <span className="brand-mark">Contoso Coffee</span>
            <span className="brand-sub">Procurement Hub</span>
          </span>
        </div>
        <nav className="app-nav" aria-label="Primary">
          {NAV.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`nav-item${screen === item.key ? ' active' : ''}`}
              aria-current={screen === item.key ? 'page' : undefined}
              onClick={() => setScreen(item.key)}
            >
              <span className="nav-icon" aria-hidden="true">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
              {item.key === 'cart' && cartCount > 0 && <span className="nav-badge">{cartCount}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          <span className="sidebar-foot-dot" aria-hidden="true" />
          Source-to-pay workspace
        </div>
      </aside>

      <div className="app-body">
        <header className="topbar">
          <div className="topbar-title">
            <h1>{active.title}</h1>
            <p className="topbar-sub">{active.sub}</p>
          </div>
          <div className="topbar-right">
            <LegalEntitySelect />
            <UserChip />
          </div>
        </header>

        {flash && (
          <div className="flash" role="status">
            {flash}
            <button className="flash-close" type="button" onClick={() => setFlash(undefined)} aria-label="Dismiss">
              ×
            </button>
          </div>
        )}

        <main className="app-main">
          {screen === 'catalog' && <CatalogScreen onGoToCart={() => setScreen('cart')} />}
          {screen === 'cart' && (
            <CartScreen
              onSubmitted={(requisitionNumber) => {
                setFlash(`Requisition ${requisitionNumber} submitted.`);
                setScreen('mine');
              }}
            />
          )}
          {screen === 'mine' && <MyRequisitionsScreen />}
          {screen === 'orders' && <OrdersScreen />}
          {screen === 'approvals' && <ApprovalsScreen />}
        </main>
      </div>

      <AssistantDrawer />
    </div>
  );
}

/** Header lookup that scopes the whole app to a selected legal entity. */
function LegalEntitySelect() {
  const { company, setCompany } = useAppState();
  const { data, loading, error } = useAsync(() => getLegalEntities(), []);
  const entities = data ?? [];

  return (
    <label className="le-select">
      <span className="le-select-label">Legal entity</span>
      <select
        value={company}
        onChange={(e) => setCompany(e.target.value)}
        disabled={loading || !!error}
        aria-label="Select legal entity"
      >
        {/* Keep the current company selectable even before the list loads. */}
        {entities.length === 0 && <option value={company}>{company}</option>}
        {entities.map((e) => (
          <option key={e.id} value={e.id}>
            {e.id} — {e.name}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Header user chip: avatar + resolved employee name for the signed-in user. */
function UserChip() {
  const { currentWorker, userFullName, userPhotoUrl, resolvingUser } = useAppState();
  const name = currentWorker?.name || userFullName;
  const initials =
    (name ?? '')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join('') || '?';

  return (
    <div
      className="user-chip"
      title={currentWorker ? `${currentWorker.name} (${currentWorker.personnelNumber})` : name}
    >
      {userPhotoUrl ? (
        <img className="user-avatar user-avatar-img" src={userPhotoUrl} alt="" />
      ) : (
        <span className="user-avatar" aria-hidden="true">{initials}</span>
      )}
      <span className="user-meta">
        <span className="user-name">{resolvingUser ? 'Signing in…' : name ?? 'Guest'}</span>
        {currentWorker && <span className="user-sub">#{currentWorker.personnelNumber}</span>}
      </span>
    </div>
  );
}

export default App;