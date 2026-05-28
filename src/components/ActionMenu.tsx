import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

export interface ActionMenuItem {
    label: string;
    icon?: string;
    onClick: () => void;
    variant?: 'default' | 'danger' | 'success' | 'warning' | 'info';
    disabled?: boolean;
    hidden?: boolean;
}

interface ActionMenuProps {
    items: ActionMenuItem[];
}

interface MenuPosition {
    top: number;
    left: number;
    openUpward: boolean;
}

const MENU_WIDTH = 200;
const MENU_ITEM_HEIGHT = 42;  // px por item
const MENU_PADDING = 16;       // padding interno total
const VIEWPORT_MARGIN = 8;     // margen mínimo con el borde de pantalla

const ActionMenu: React.FC<ActionMenuProps> = ({ items }) => {
    const [open, setOpen] = useState(false);
    const [pos, setPos] = useState<MenuPosition>({ top: 0, left: 0, openUpward: false });
    const triggerRef = useRef<HTMLButtonElement>(null);

    const visibleItems = items.filter(i => !i.hidden);

    const calcPosition = useCallback(() => {
        if (!triggerRef.current) return;
        const rect = triggerRef.current.getBoundingClientRect();
        const menuHeight = visibleItems.length * MENU_ITEM_HEIGHT + MENU_PADDING;

        const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_MARGIN;
        // Abrir hacia arriba si no hay espacio suficiente abajo (aunque tampoco haya arriba)
        const openUpward = spaceBelow < menuHeight;

        // Calcular top
        let top: number;
        if (openUpward) {
            top = rect.top - menuHeight - 4;
            // Si queda fuera por arriba, lo pegamos al margen superior
            if (top < VIEWPORT_MARGIN) top = VIEWPORT_MARGIN;
        } else {
            top = rect.bottom + 4;
            // Si queda fuera por abajo, lo subimos
            const bottomEdge = top + menuHeight;
            if (bottomEdge > window.innerHeight - VIEWPORT_MARGIN) {
                top = window.innerHeight - VIEWPORT_MARGIN - menuHeight;
            }
        }

        // Calcular left: alinear borde derecho con trigger, ajustar si sale de pantalla
        let left = rect.right - MENU_WIDTH;
        if (left < VIEWPORT_MARGIN) left = rect.left;
        if (left + MENU_WIDTH > window.innerWidth - VIEWPORT_MARGIN) {
            left = window.innerWidth - VIEWPORT_MARGIN - MENU_WIDTH;
        }

        setPos({ top, left, openUpward });
    }, [visibleItems.length]);

    const handleOpen = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!open) {
            calcPosition();
            setOpen(true);
        } else {
            setOpen(false);
        }
    };

    useEffect(() => {
        if (!open) return;
        const close = () => setOpen(false);
        const handleScroll = () => { calcPosition(); };

        document.addEventListener('mousedown', close);
        window.addEventListener('scroll', handleScroll, true);
        window.addEventListener('resize', close);

        return () => {
            document.removeEventListener('mousedown', close);
            window.removeEventListener('scroll', handleScroll, true);
            window.removeEventListener('resize', close);
        };
    }, [open, calcPosition]);

    if (visibleItems.length === 0) return null;

    const dropdown = open ? (
        <div
            onMouseDown={e => e.stopPropagation()}
            style={{
                position: 'fixed',
                top: pos.top,
                left: pos.left,
                width: MENU_WIDTH,
                zIndex: 9999,
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.07)',
                padding: '0.3rem 0',
                animation: 'menuFadeIn 0.12s ease',
                transformOrigin: pos.openUpward ? 'bottom right' : 'top right',
            }}
        >
            {visibleItems.map((item, i) => (
                <button
                    key={i}
                    disabled={item.disabled}
                    className={`action-menu-item action-menu-item--${item.variant ?? 'default'}`}
                    onClick={(e) => {
                        e.stopPropagation();
                        setOpen(false);
                        item.onClick();
                    }}
                >
                    {item.icon && <span className="action-menu-item-icon">{item.icon}</span>}
                    <span>{item.label}</span>
                </button>
            ))}
        </div>
    ) : null;

    return (
        <div className="action-menu-wrapper">
            <button
                ref={triggerRef}
                className="action-menu-trigger"
                onClick={handleOpen}
                title="Más opciones"
                aria-haspopup="true"
                aria-expanded={open}
            >
                <span className="action-menu-dots">⋮</span>
            </button>

            {/* Portal: renderiza el menú en document.body, fuera de cualquier overflow */}
            {createPortal(dropdown, document.body)}
        </div>
    );
};

export default ActionMenu;
