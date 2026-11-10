import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { coord } from "./engine/generator";

export interface DragTile {
  id: string;
  letter: string;
  value: number;
  blank: boolean;
}
interface Target {
  kind: "board" | "rack";
  at: number | null;
  valid: boolean;
}
interface Options {
  enabled: boolean;
  canDrop: (id: string, at: number) => boolean;
  isStaged: (id: string) => boolean;
  onDrop: (id: string, at: number) => void;
  onRecall: (id: string) => void;
}
interface Session {
  tile: DragTile;
  pointer: number;
  type: string;
  source: HTMLButtonElement;
  startX: number;
  startY: number;
  x: number;
  y: number;
  active: boolean;
}

export function useTileDrag(options: Options) {
  const latest = useRef(options);
  useLayoutEffect(() => {
    latest.current = options;
  });
  const session = useRef<Session | null>(null);
  const frame = useRef<number | null>(null);
  const ghost = useRef<HTMLDivElement>(null);
  const suppress = useRef(false);
  const clearClick = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [tile, setTile] = useState<DragTile | null>(null);
  const [target, setTarget] = useState<Target | null>(null);
  const lastTarget = useRef<Target | null>(null);
  const [announcement, setAnnouncement] = useState("");

  const hit = useCallback((x: number, y: number): Target | null => {
    const current = session.current;
    if (!current) return null;
    const element = document.elementFromPoint(x, y);
    const square = element?.closest<HTMLElement>("[data-board-square]");
    if (square) {
      const at = Number(square.dataset.boardSquare);
      return {
        kind: "board",
        at,
        valid: latest.current.canDrop(current.tile.id, at),
      };
    }
    if (element?.closest("[data-drop-rack]"))
      return {
        kind: "rack",
        at: null,
        valid: latest.current.isStaged(current.tile.id),
      };
    return null;
  }, []);
  const stop = useCallback((render = true) => {
    const current = session.current;
    session.current = null;
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    if (current?.active && current.source.hasPointerCapture(current.pointer))
      current.source.releasePointerCapture(current.pointer);
    lastTarget.current = null;
    if (render) {
      setTile(null);
      setTarget(null);
    }
  }, []);
  const position = useCallback(() => {
    const current = session.current;
    if (!current || !ghost.current) return;
    const x = Math.max(
      4,
      Math.min(
        window.innerWidth - 56,
        current.x + (current.type === "touch" ? -26 : 14),
      ),
    );
    const y = Math.max(
      4,
      Math.min(
        window.innerHeight - 76,
        current.y - (current.type === "touch" ? 82 : 60),
      ),
    );
    ghost.current.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(-3deg)`;
  }, []);
  useLayoutEffect(position, [tile, position]);

  const tick = useCallback(
    function animate() {
      const current = session.current;
      if (!current?.active) return;
      // Pan an enlarged board at its edges; empty-square touch scrolling remains native.
      const viewport = document.querySelector<HTMLElement>(
        ".board-viewport.is-enlarged",
      );
      let boardPanned = false;
      if (viewport) {
        const box = viewport.getBoundingClientRect();
        if (
          current.x >= box.left &&
          current.x <= box.right &&
          current.y >= box.top &&
          current.y <= box.bottom
        ) {
          const beforeX = viewport.scrollLeft,
            beforeY = viewport.scrollTop;
          if (current.x < box.left + 36) viewport.scrollLeft -= 7;
          else if (current.x > box.right - 28) viewport.scrollLeft += 7;
          if (current.y < box.top + 40) viewport.scrollTop -= 7;
          else if (current.y > box.bottom - 28) viewport.scrollTop += 7;
          boardPanned =
            beforeX !== viewport.scrollLeft || beforeY !== viewport.scrollTop;
        }
      }
      if (!boardPanned) {
        if (current.y < 48) window.scrollBy(0, -10);
        else if (current.y > window.innerHeight - 48) window.scrollBy(0, 10);
      }
      position();
      const next = hit(current.x, current.y);
      const previous = lastTarget.current;
      if (
        next?.kind !== previous?.kind ||
        next?.at !== previous?.at ||
        next?.valid !== previous?.valid
      ) {
        lastTarget.current = next;
        setTarget(next);
      }
      frame.current = requestAnimationFrame(animate);
    },
    [hit, position],
  );

  useEffect(() => {
    const down = () => {
      suppress.current = false;
    };
    const move = (event: PointerEvent) => {
      const current = session.current;
      if (!current || current.pointer !== event.pointerId) return;
      if (!latest.current.enabled) {
        stop();
        return;
      }
      current.x = event.clientX;
      current.y = event.clientY;
      if (
        !current.active &&
        Math.hypot(current.x - current.startX, current.y - current.startY) >= 8
      ) {
        current.active = true;
        current.source.setPointerCapture(current.pointer);
        setTile(current.tile);
        setAnnouncement(
          "Drag to an empty square. Drop on your rack to return a tile.",
        );
        frame.current = requestAnimationFrame(tick);
      }
    };
    const up = (event: PointerEvent) => {
      const current = session.current;
      if (!current || current.pointer !== event.pointerId) return;
      if (!current.active) {
        stop();
        return;
      }
      // Use the release coordinates, not the previous animation frame's hover.
      const destination = latest.current.enabled
        ? hit(event.clientX, event.clientY)
        : null;
      suppress.current = true;
      if (clearClick.current) clearTimeout(clearClick.current);
      clearClick.current = setTimeout(() => {
        suppress.current = false;
      }, 0);
      stop();
      if (
        destination?.valid &&
        destination.kind === "board" &&
        destination.at !== null
      ) {
        latest.current.onDrop(current.tile.id, destination.at);
        setAnnouncement(`Tile placed at ${coord(destination.at)}.`);
      } else if (destination?.valid && destination.kind === "rack") {
        latest.current.onRecall(current.tile.id);
        setAnnouncement("Tile returned to your rack.");
      } else setAnnouncement("Drop cancelled. The tile has not moved.");
    };
    const cancel = (event: PointerEvent) => {
      if (event.pointerId === session.current?.pointer) stop();
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && session.current) {
        event.preventDefault();
        stop();
        setAnnouncement("Drag cancelled.");
      }
    };
    const blur = () => {
      if (session.current) stop();
    };
    window.addEventListener("pointerdown", down, true);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancel);
    window.addEventListener("keydown", escape);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("pointerdown", down, true);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
      window.removeEventListener("keydown", escape);
      window.removeEventListener("blur", blur);
      if (clearClick.current) clearTimeout(clearClick.current);
      stop(false);
    };
  }, [hit, stop, tick]);
  useEffect(() => {
    if (!options.enabled && session.current) stop();
  }, [options.enabled, stop]);

  const begin = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>, dragged: DragTile) => {
      if (
        !latest.current.enabled ||
        session.current ||
        !event.isPrimary ||
        event.button !== 0
      )
        return;
      // A new physical gesture must never inherit click suppression from a drag
      // whose touch compatibility-click was omitted by the browser.
      suppress.current = false;
      if (clearClick.current) clearTimeout(clearClick.current);
      session.current = {
        tile: dragged,
        pointer: event.pointerId,
        type: event.pointerType,
        source: event.currentTarget,
        startX: event.clientX,
        startY: event.clientY,
        x: event.clientX,
        y: event.clientY,
        active: false,
      };
    },
    [],
  );
  const suppressClick = useCallback((event: ReactMouseEvent) => {
    if ((suppress.current && event.detail > 0) || session.current?.active) {
      event.preventDefault();
      event.stopPropagation();
      suppress.current = false;
    }
  }, []);
  const label =
    target?.kind === "board" && target.at !== null
      ? `${coord(target.at)}${target.valid ? "" : " · occupied"}`
      : target?.kind === "rack" && target.valid
        ? "Return to rack"
        : "Drag to board";
  return {
    tile,
    target,
    begin,
    suppressClick,
    overlay: (
      <>
        {tile && (
          <div
            ref={ghost}
            className={`drag-ghost ${target?.kind === "board" && !target.valid ? "invalid" : ""}`}
            aria-hidden="true"
          >
            <span
              className={
                tile.blank && tile.letter !== "◇" ? "blank-letter" : ""
              }
            >
              {tile.letter}
            </span>
            <sup>{tile.value}</sup>
            <small>{label}</small>
          </div>
        )}
        <span className="sr-only" role="status">
          {tile ? label : announcement}
        </span>
      </>
    ),
  };
}
