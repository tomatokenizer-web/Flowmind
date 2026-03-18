import { describe, it, expect, beforeEach } from "vitest";
import { useCaptureStore } from "@/stores/capture-store";

describe("capture store", () => {
  beforeEach(() => {
    // Reset store state between tests
    useCaptureStore.setState({
      isOpen: false,
      mode: "capture",
      pendingText: "",
    });
  });

  it("starts closed in capture mode with empty text", () => {
    const state = useCaptureStore.getState();
    expect(state.isOpen).toBe(false);
    expect(state.mode).toBe("capture");
    expect(state.pendingText).toBe("");
  });

  it("opens capture mode", () => {
    useCaptureStore.getState().open();
    expect(useCaptureStore.getState().isOpen).toBe(true);
  });

  it("closes capture mode and clears text", () => {
    useCaptureStore.setState({ isOpen: true, pendingText: "some text" });
    useCaptureStore.getState().close();

    const state = useCaptureStore.getState();
    expect(state.isOpen).toBe(false);
    expect(state.pendingText).toBe("");
  });

  it("toggles open/close", () => {
    useCaptureStore.getState().toggle();
    expect(useCaptureStore.getState().isOpen).toBe(true);

    useCaptureStore.getState().toggle();
    expect(useCaptureStore.getState().isOpen).toBe(false);
  });

  it("clears text on toggle-close", () => {
    useCaptureStore.setState({ isOpen: true, pendingText: "draft" });
    useCaptureStore.getState().toggle();

    expect(useCaptureStore.getState().pendingText).toBe("");
  });

  it("toggles between capture and organize mode", () => {
    expect(useCaptureStore.getState().mode).toBe("capture");

    useCaptureStore.getState().toggleMode();
    expect(useCaptureStore.getState().mode).toBe("organize");

    useCaptureStore.getState().toggleMode();
    expect(useCaptureStore.getState().mode).toBe("capture");
  });

  it("sets mode directly", () => {
    useCaptureStore.getState().setMode("organize");
    expect(useCaptureStore.getState().mode).toBe("organize");

    useCaptureStore.getState().setMode("capture");
    expect(useCaptureStore.getState().mode).toBe("capture");
  });

  it("sets and clears pending text", () => {
    useCaptureStore.getState().setText("hello world");
    expect(useCaptureStore.getState().pendingText).toBe("hello world");

    useCaptureStore.getState().clearText();
    expect(useCaptureStore.getState().pendingText).toBe("");
  });
});
