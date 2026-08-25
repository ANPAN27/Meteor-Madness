import React, { useEffect, useRef } from 'react';

export type ContextMenuItem =
  | { label: string; action: () => void; shortcut?: string; type?: never }
  | { type: 'separator'; label?: never; action?: never; shortcut?: never };

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, items, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (rect.right > vw) menuRef.current.style.left = `${x - rect.width}px`;
    if (rect.bottom > vh) menuRef.current.style.top = `${y - rect.height}px`;
  }, [x, y]);

  return (
    <div
      ref={menuRef}
      style={{ left: x, top: y }}
      className="fixed z-[9999] min-w-[200px] py-1 bg-[#0e1015] border border-[#2a303d] rounded-[2px] shadow-xl shadow-black/50 font-mono"
    >
      {items.map((item, i) =>
        item.type === 'separator' ? (
          <div key={i} className="my-1 border-t border-[#1e222b]" />
        ) : (
          <button
            key={i}
            onClick={(e) => {
              e.stopPropagation();
              item.action();
              onClose();
            }}
            className="w-full px-3 py-1.5 text-left text-[11px] text-neutral-300 hover:bg-[#00d8e6]/10 hover:text-[#00d8e6] flex items-center justify-between gap-6 transition-colors"
          >
            <span>{item.label}</span>
            {item.shortcut && (
              <span className="text-[9px] text-neutral-500 tracking-wider">{item.shortcut}</span>
            )}
          </button>
        )
      )}
    </div>
  );
};
