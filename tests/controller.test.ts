import { expect, test, vi } from "vitest";
const store = vi.hoisted(() => ({
  saveGame: vi.fn(),
  loadGame: vi.fn(),
  exportSave: vi.fn(),
}));
vi.mock("../src/storage/game-store", () => store);

test("Pass device hides private result notes before a slow save finishes", async () => {
  store.loadGame.mockResolvedValue(null);
  store.saveGame.mockResolvedValue(undefined);
  const { controller } = await import("../src/controller");
  await controller.initialize();
  await controller.newGame(
    ["Player 1", "Player 2"],
    "REVEAL_USED",
    "handoff-lock",
  );
  await controller.action({ type: "PASS" });
  await controller.note(0, 16);
  expect(controller.getSnapshot().view!.board[0].note).toBe(16);
  let finish: () => void = () => {
    throw Error("Save did not start");
  };
  store.saveGame.mockImplementationOnce(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  const handoff = controller.handoff();
  expect(controller.getSnapshot().busy).toBe(true);
  expect(controller.getSnapshot().view!.phase).toBe("HANDOFF");
  expect(controller.getSnapshot().view!.board[0].note).toBeUndefined();
  expect(controller.getSnapshot().view!.rack).toEqual([]);
  finish();
  await handoff;
  expect(controller.getSnapshot().busy).toBe(false);
});
