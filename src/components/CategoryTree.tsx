import { useMemo, useState, type KeyboardEvent } from 'react';
import type { CategoryNode } from '../models';

interface FlatItem {
  node: CategoryNode;
  depth: number;
  hasChildren: boolean;
}

/** Flatten the visible (expanded) portion of the tree for keyboard navigation. */
function flatten(nodes: CategoryNode[], expanded: Set<string>, depth = 0): FlatItem[] {
  const out: FlatItem[] = [];
  for (const node of nodes) {
    const hasChildren = node.children.length > 0;
    out.push({ node, depth, hasChildren });
    if (hasChildren && expanded.has(node.name)) {
      out.push(...flatten(node.children, expanded, depth + 1));
    }
  }
  return out;
}

/**
 * Accessible, keyboard-navigable procurement category tree.
 * ArrowUp/Down move, ArrowRight/Left expand/collapse, Enter/Space select.
 */
export function CategoryTree({
  categories,
  selected,
  onSelect,
}: {
  categories: CategoryNode[];
  selected?: string;
  onSelect: (name: string) => void;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [focusName, setFocusName] = useState<string | undefined>(selected);

  const visible = useMemo(() => flatten(categories, expanded), [categories, expanded]);

  const toggle = (name: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });

  const focusIndex = visible.findIndex((v) => v.node.name === focusName);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>, item: FlatItem, index: number) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusName(visible[Math.min(index + 1, visible.length - 1)]?.node.name);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusName(visible[Math.max(index - 1, 0)]?.node.name);
        break;
      case 'ArrowRight':
        e.preventDefault();
        if (item.hasChildren && !expanded.has(item.node.name)) toggle(item.node.name);
        else if (item.hasChildren) setFocusName(visible[index + 1]?.node.name);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        if (item.hasChildren && expanded.has(item.node.name)) toggle(item.node.name);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        onSelect(item.node.name);
        break;
    }
  };

  return (
    <div className="tree" role="tree" aria-label="Procurement categories">
      {visible.map((item, index) => {
        const isSelected = item.node.name === selected;
        const isFocusable = index === (focusIndex === -1 ? 0 : focusIndex);
        return (
          <div
            key={`${item.node.hierarchyName}/${item.node.name}`}
            role="treeitem"
            aria-level={item.depth + 1}
            aria-selected={isSelected}
            aria-expanded={item.hasChildren ? expanded.has(item.node.name) : undefined}
            tabIndex={isFocusable ? 0 : -1}
            className={`tree-item${isSelected ? ' selected' : ''}`}
            style={{ paddingLeft: 8 + item.depth * 16 }}
            onKeyDown={(e) => onKeyDown(e, item, index)}
            onClick={() => {
              setFocusName(item.node.name);
              onSelect(item.node.name);
            }}
          >
            <button
              type="button"
              className={`tree-toggle${item.hasChildren ? '' : ' invisible'}`}
              aria-hidden={!item.hasChildren}
              tabIndex={-1}
              onClick={(e) => {
                e.stopPropagation();
                if (item.hasChildren) toggle(item.node.name);
              }}
            >
              {item.hasChildren ? (expanded.has(item.node.name) ? '▾' : '▸') : ''}
            </button>
            <span className="tree-label" title={item.node.description || item.node.name}>
              {item.node.name}
            </span>
          </div>
        );
      })}
    </div>
  );
}
