import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUpRight,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { money, percent, type Counterparty } from "./types";

export function Status({ value }: { value: string }) {
  return (
    <span
      className={`status ${value === "Breach" ? "danger" : value === "Watch" ? "warning" : "good"}`}
    >
      <i />
      {value}
    </span>
  );
}
export function CounterpartyTable({
  rows,
  compact = false,
  onSelect,
  onViewAll,
}: {
  rows: Counterparty[];
  compact?: boolean;
  onSelect: (c: Counterparty) => void;
  onViewAll?: () => void;
}) {
  const [query, setQuery] = useState(""),
    [filter, setFilter] = useState("All statuses"),
    [sort, setSort] = useState("utilization");
  const filtered = rows
    .filter(
      (r) =>
        (!compact || r.status !== "Within limit") &&
        (filter === "All statuses" || r.status === filter) &&
        `${r.name} ${r.id} ${r.rating} ${r.product}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .toSorted((a, b) =>
      sort === "name"
        ? a.name.localeCompare(b.name)
        : b[sort as "net" | "utilization"] - a[sort as "net" | "utilization"],
    );
  const shown = compact ? filtered.slice(0, 5) : filtered;
  return (
    <section className="panel counterparty-panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">
            {compact ? "PRIORITY REVIEW" : "CREDIT REGISTER"}
          </span>
          <h2>
            {compact ? "Counterparties to watch" : "Counterparty portfolio"}{" "}
            <span className="count">
              {compact
                ? rows.filter((r) => r.status !== "Within limit").length
                : rows.length}
            </span>
          </h2>
        </div>
        {compact && (
          <button className="text-button" onClick={onViewAll}>
            View all <ArrowUpRight size={15} />
          </button>
        )}
      </div>
      {!compact && (
        <div className="table-tools">
          <label className="search-field">
            <Search size={16} />
            <input
              aria-label="Search counterparties"
              placeholder="Search name, rating or product…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <label className="select-wrap">
            <SlidersHorizontal size={14} />
            <select
              aria-label="Filter counterparty status"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              {["All statuses", "Breach", "Watch", "Within limit"].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
        </div>
      )}
      <div
        className="table-scroll"
        tabIndex={0}
        role="region"
        aria-label="Counterparty exposure table"
      >
        <table>
          <thead>
            <tr>
              <th>
                <button onClick={() => setSort("name")}>Counterparty</button>
              </th>
              <th>Rating</th>
              <th>
                <button onClick={() => setSort("net")}>
                  Net exposure <ArrowDown size={11} />
                </button>
              </th>
              <th>
                <button onClick={() => setSort("utilization")}>
                  Limit utilisation <ArrowDown size={11} />
                </button>
              </th>
              <th>Status</th>
              <th>
                <span className="sr-only">Review</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r, i) => (
              <tr key={r.id}>
                <td>
                  <button className="company" onClick={() => onSelect(r)}>
                    <span className={`company-monogram tone-${i % 4}`}>
                      {r.name
                        .split(" ")
                        .map((s) => s[0])
                        .slice(0, 2)
                        .join("")}
                    </span>
                    <span>
                      <b>{r.name}</b>
                      <small>
                        {r.region} <span>·</span> {r.sector}
                      </small>
                    </span>
                  </button>
                </td>
                <td>
                  <span className="rating">{r.rating}</span>
                </td>
                <td className="numeric">{money(r.net, 2)}</td>
                <td>
                  <div className="utilization">
                    <span className={r.utilization > 1 ? "red-text" : ""}>
                      {percent(r.utilization)}
                    </span>
                    <div>
                      <i
                        className={
                          r.utilization > 1
                            ? "over"
                            : r.utilization > 0.9
                              ? "near"
                              : ""
                        }
                        style={{
                          width: `${Math.min(r.utilization * 100, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </td>
                <td>
                  <Status value={r.status} />
                </td>
                <td>
                  <button
                    className="icon-button row-open"
                    aria-label={`Review ${r.name}`}
                    onClick={() => onSelect(r)}
                  >
                    <ArrowUpRight size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {shown.length === 0 && (
        <div className="empty-state">
          No counterparties match these filters. Try another name or status.
        </div>
      )}
      <div className="table-foot">
        <span>
          Showing {shown.length} of {filtered.length} counterparties
        </span>
        <span>Exposure in USD · Synthetic portfolio</span>
      </div>
    </section>
  );
}
export function ReviewDialog({
  selected,
  onClose,
}: {
  selected: Counterparty | null;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [note, setNote] = useState(""),
    [saved, setSaved] = useState(false),
    [storageError, setStorageError] = useState(false);
  useEffect(() => {
    if (selected) {
      setSaved(false);
      setStorageError(false);
      try {
        setNote(localStorage.getItem(`meridian-note-${selected.id}`) || "");
      } catch {
        setNote("");
        setStorageError(true);
      }
      dialog.current?.showModal();
    } else dialog.current?.close();
  }, [selected]);
  const save = () => {
    try {
      localStorage.setItem(`meridian-note-${selected!.id}`, note);
      setSaved(true);
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  };
  return (
    <dialog
      ref={dialog}
      aria-label="Counterparty review"
      className="review-dialog"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {selected && (
        <>
          <div className="dialog-header">
            <span className="eyebrow">COUNTERPARTY REVIEW · {selected.id}</span>
            <button
              autoFocus
              className="icon-button"
              aria-label="Close review"
              onClick={onClose}
            >
              <X size={20} />
            </button>
          </div>
          <h2>{selected.name}</h2>
          <div className="dialog-subtitle">
            {selected.region} / {selected.sector}{" "}
            <Status value={selected.status} />
          </div>
          <div className="review-grid">
            {[
              ["Credit rating", selected.rating],
              ["One-year PD", percent(selected.pd, 2)],
              ["Net exposure", money(selected.net, 2)],
              ["Potential exposure", money(selected.pfe, 2)],
              ["Credit limit", money(selected.limit, 2)],
              ["Margin shortfall", money(selected.margin_due, 2)],
              ["Debt / EBITDA", `${selected.leverage}×`],
              ["Interest coverage", `${selected.interest_cover}×`],
            ].map(([label, value]) => (
              <div key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
          <div className="review-insight">
            <b>
              {selected.status === "Breach"
                ? "Limit requires attention"
                : "Credit review"}
            </b>
            <p>
              {selected.status === "Breach"
                ? `Potential exposure exceeds the approved demo limit by ${money(selected.pfe - selected.limit, 2)}. Review collateral coverage and the ${selected.product.toLowerCase()} position.`
                : `Potential exposure uses ${percent(selected.utilization)} of the demo limit. The next scheduled credit review is ${selected.review_date}.`}
            </p>
          </div>
          <label className="note-label" htmlFor="review-note">
            Analyst note <span>Saved on this device</span>
          </label>
          <textarea
            id="review-note"
            rows={4}
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              setSaved(false);
            }}
            placeholder="Record the exposure driver and next action…"
          />
          <div className="dialog-footer">
            <span role="status">
              {storageError
                ? "Browser storage unavailable. Copy your note before closing."
                : saved
                  ? "Note saved on this device."
                  : "Fictional counterparty · demonstration data"}
            </span>
            <button className="primary-button" onClick={save}>
              Save note
            </button>
          </div>
        </>
      )}
    </dialog>
  );
}
