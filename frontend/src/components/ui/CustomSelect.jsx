import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, Search, X } from 'lucide-react';

/**
 * Modern, tema uyumlu (aydınlık/karanlık), portal tabanlı özel açılır menü (CustomSelect).
 *
 * Varyantlar:
 * - 'filter' (varsayılan): Filtre panelleri için şık kart/input görünümü
 * - 'pill': Tablo içi durum rozetleri için kompakt pill görünümü
 */
export default function CustomSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Seçiniz...',
  icon: Icon = null,
  variant = 'filter',
  isActive = false,
  searchable = false,
  searchPlaceholder = 'Ara...',
  triggerClassName = '',
  menuMinWidth = 176,
  ariaLabel,
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [coords, setCoords] = useState(null);

  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const searchInputRef = useRef(null);
  const listRef = useRef(null);

  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === value) || null,
    [options, value]
  );

  const filteredOptions = useMemo(() => {
    const term = query.trim().toLocaleLowerCase('tr-TR');
    if (!term) return options;
    return options.filter((opt) =>
      String(opt.label || '')
        .toLocaleLowerCase('tr-TR')
        .includes(term)
    );
  }, [options, query]);

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    const margin = 8;

    const width = Math.min(
      Math.max(rect.width, menuMinWidth),
      viewportW - margin * 2
    );

    let left = rect.left;
    if (left + width > viewportW - margin) {
      left = Math.max(margin, rect.right - width);
    }
    if (left < margin) {
      left = margin;
    }

    const estimatedMenuHeight = Math.min(
      (searchable ? 46 : 0) + Math.min(options.length, 7) * 38 + 16,
      300
    );
    const spaceBelow = viewportH - rect.bottom - margin;
    const spaceAbove = rect.top - margin;
    const openUpward = spaceBelow < estimatedMenuHeight && spaceAbove > spaceBelow;

    setCoords({
      left,
      width,
      top: openUpward ? undefined : rect.bottom + 6,
      bottom: openUpward ? viewportH - rect.top + 6 : undefined,
      maxHeight: Math.max(140, Math.min(280, (openUpward ? spaceAbove : spaceBelow) - 8)),
      openUpward,
    });
  }, [menuMinWidth, options.length, searchable]);

  const openMenu = useCallback(() => {
    if (disabled) return;
    const selectedIdx = options.findIndex((o) => o.value === value);
    setHighlightedIndex(selectedIdx >= 0 ? selectedIdx : 0);
    setOpen(true);
  }, [disabled, options, value]);

  const closeMenu = useCallback(() => {
    setOpen(false);
    setQuery('');
    setHighlightedIndex(-1);
  }, []);

  const handleSelect = useCallback(
    (optionValue) => {
      if (optionValue !== value) {
        onChange?.(optionValue);
      }
      closeMenu();
      triggerRef.current?.focus();
    },
    [value, onChange, closeMenu]
  );

  useEffect(() => {
    if (!open) return;

    updatePosition();

    const handlePointerDown = (e) => {
      if (
        triggerRef.current?.contains(e.target) ||
        menuRef.current?.contains(e.target)
      ) {
        return;
      }
      closeMenu();
    };

    const handleScrollOrResize = (e) => {
      // Menü içindeki kendi kaydırmasını yoksay
      if (menuRef.current && e?.target && menuRef.current.contains(e.target)) {
        return;
      }
      updatePosition();
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeMenu();
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown, { passive: true });
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [open, updatePosition, closeMenu]);

  useEffect(() => {
    if (open && searchable) {
      requestAnimationFrame(() => searchInputRef.current?.focus());
    }
  }, [open, searchable]);

  const handleListKeyDown = (e) => {
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        openMenu();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        filteredOptions.length === 0 ? -1 : (prev + 1) % filteredOptions.length
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        filteredOptions.length === 0
          ? -1
          : (prev - 1 + filteredOptions.length) % filteredOptions.length
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = filteredOptions[highlightedIndex];
      if (target) handleSelect(target.value);
    } else if (e.key === 'Tab') {
      closeMenu();
    }
  };

  useEffect(() => {
    if (!open || highlightedIndex < 0 || !listRef.current) return;
    const item = listRef.current.children[highlightedIndex];
    if (item && typeof item.scrollIntoView === 'function') {
      item.scrollIntoView({ block: 'nearest' });
    }
  }, [open, highlightedIndex]);

  const baseTriggerClass =
    variant === 'pill'
      ? `inline-flex items-center justify-between gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full transition-all cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60 hover:brightness-95 dark:hover:brightness-110 ${triggerClassName}`
      : `group w-full min-w-0 flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-all duration-150 cursor-pointer select-none outline-none border ${
          open
            ? 'bg-white dark:bg-slate-800 border-violet-400 dark:border-violet-500 ring-2 ring-violet-400/20 text-slate-900 dark:text-white shadow-xs'
            : isActive
              ? 'bg-violet-50/70 dark:bg-violet-500/15 border-violet-300/90 dark:border-violet-500/40 text-violet-900 dark:text-violet-100 hover:border-violet-400'
              : 'bg-slate-50/90 dark:bg-slate-800/90 border-slate-200/90 dark:border-slate-700/90 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600'
        } ${triggerClassName}`;

  const menuPortal =
    open && coords
      ? createPortal(
          <div
            ref={menuRef}
            role="listbox"
            aria-label={ariaLabel}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={handleListKeyDown}
            style={{
              position: 'fixed',
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              top: coords.top !== undefined ? `${coords.top}px` : undefined,
              bottom: coords.bottom !== undefined ? `${coords.bottom}px` : undefined,
              zIndex: 9999,
            }}
            className="rounded-2xl bg-white/98 dark:bg-slate-900/98 backdrop-blur-md border border-slate-200/95 dark:border-slate-700/90 shadow-xl shadow-slate-900/12 dark:shadow-black/45 overflow-hidden animate-fade-in"
          >
            {searchable && (
              <div className="p-2 border-b border-slate-100 dark:border-slate-800">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setHighlightedIndex(0);
                    }}
                    placeholder={searchPlaceholder}
                    className="w-full bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-lg pl-8 pr-7 py-1.5 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-violet-400"
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={() => setQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      aria-label="Aramayı temizle"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}

            <div
              ref={listRef}
              style={{ maxHeight: `${coords.maxHeight}px` }}
              className="overflow-y-auto p-1.5 space-y-0.5"
            >
              {filteredOptions.length === 0 ? (
                <div className="px-3 py-4 text-center text-xs text-slate-400 dark:text-slate-500">
                  Sonuç bulunamadı
                </div>
              ) : (
                filteredOptions.map((opt, idx) => {
                  const isSelected = opt.value === value;
                  const isHighlighted = idx === highlightedIndex;

                  return (
                    <button
                      key={String(opt.value)}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                      onClick={() => handleSelect(opt.value)}
                      className={`w-full flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-xl text-left text-xs transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-violet-50 dark:bg-violet-500/20 text-violet-800 dark:text-violet-200 font-bold'
                          : isHighlighted
                            ? 'bg-slate-100/90 dark:bg-slate-800 text-slate-900 dark:text-white font-medium'
                            : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 font-medium'
                      }`}
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        {opt.dotClass && (
                          <span
                            className={`w-2 h-2 rounded-full flex-shrink-0 ${opt.dotClass}`}
                          />
                        )}
                        <span className="truncate">{opt.label}</span>
                      </span>
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-violet-600 dark:text-violet-300 flex-shrink-0" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={(e) => {
          e.stopPropagation();
          if (open) closeMenu();
          else openMenu();
        }}
        onKeyDown={handleListKeyDown}
        className={baseTriggerClass}
      >
        <span className="flex items-center gap-1.5 min-w-0">
          {selectedOption?.dotClass ? (
            <span
              className={`w-2 h-2 rounded-full flex-shrink-0 ${selectedOption.dotClass}`}
            />
          ) : Icon ? (
            <Icon
              className={`w-3.5 h-3.5 flex-shrink-0 transition-colors ${
                isActive || open
                  ? 'text-violet-500 dark:text-violet-400'
                  : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-500'
              }`}
            />
          ) : null}
          <span className="truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 flex-shrink-0 transition-transform duration-200 ${
            variant === 'pill'
              ? 'opacity-75'
              : isActive || open
                ? 'text-violet-500 dark:text-violet-400'
                : 'text-slate-400 dark:text-slate-500'
          } ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {menuPortal}
    </>
  );
}
