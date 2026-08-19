import { describe, it, expect } from "vitest";
import {
  ORDER_STATUSES,
  canTransition,
  assertValidTransition,
  InvalidTransitionError,
  isTerminalStatus,
  getValidNextStatuses,
  getNextDriverStatus,
} from "./state-machine";
import type { OrderStatus } from "@/types/domain";

// Fase 7 — testes unitários da máquina de estados (secção 27 da
// especificação: "transições válidas; transições inválidas").

const HAPPY_PATH: OrderStatus[] = [
  "PENDING",
  "SEARCHING_DRIVER",
  "DRIVER_ASSIGNED",
  "DRIVER_ARRIVING",
  "DRIVER_ARRIVED",
  "CARGO_LOADING",
  "CARGO_LOADED",
  "IN_TRANSIT",
  "DELIVERED",
];

describe("state-machine — transições válidas", () => {
  it("permite cada passo consecutivo do fluxo normal (secção 9)", () => {
    for (let i = 0; i < HAPPY_PATH.length - 1; i++) {
      expect(canTransition(HAPPY_PATH[i], HAPPY_PATH[i + 1])).toBe(true);
    }
  });

  it("assertValidTransition não lança para transições válidas", () => {
    expect(() => assertValidTransition("PENDING", "SEARCHING_DRIVER")).not.toThrow();
    expect(() => assertValidTransition("IN_TRANSIT", "DELIVERED")).not.toThrow();
  });

  it("permite cancelamento a partir de qualquer estado não-terminal (decisão provisória, docs/TODO.md)", () => {
    const nonTerminal = ORDER_STATUSES.filter((s) => !isTerminalStatus(s));
    for (const status of nonTerminal) {
      expect(canTransition(status, "CANCELLED")).toBe(true);
    }
  });
});

describe("state-machine — transições inválidas", () => {
  it("rejeita saltar estados no fluxo normal", () => {
    expect(canTransition("PENDING", "DRIVER_ASSIGNED")).toBe(false);
    expect(canTransition("SEARCHING_DRIVER", "DRIVER_ARRIVED")).toBe(false);
    expect(canTransition("DRIVER_ASSIGNED", "IN_TRANSIT")).toBe(false);
  });

  it("rejeita voltar atrás no fluxo", () => {
    expect(canTransition("IN_TRANSIT", "CARGO_LOADED")).toBe(false);
    expect(canTransition("DELIVERED", "IN_TRANSIT")).toBe(false);
  });

  it("não permite nenhuma transição a partir de estados terminais (DELIVERED, CANCELLED)", () => {
    for (const target of ORDER_STATUSES) {
      expect(canTransition("DELIVERED", target)).toBe(false);
      expect(canTransition("CANCELLED", target)).toBe(false);
    }
    expect(getValidNextStatuses("DELIVERED")).toEqual([]);
    expect(getValidNextStatuses("CANCELLED")).toEqual([]);
  });

  it("assertValidTransition lança InvalidTransitionError para transições inválidas", () => {
    expect(() => assertValidTransition("PENDING", "DELIVERED")).toThrow(InvalidTransitionError);
    expect(() => assertValidTransition("DELIVERED", "PENDING")).toThrow(InvalidTransitionError);
  });

  it("não permite transição para o mesmo estado (sem no-op)", () => {
    for (const status of ORDER_STATUSES) {
      expect(canTransition(status, status)).toBe(false);
    }
  });
});

describe("isTerminalStatus", () => {
  it("identifica DELIVERED e CANCELLED como terminais", () => {
    expect(isTerminalStatus("DELIVERED")).toBe(true);
    expect(isTerminalStatus("CANCELLED")).toBe(true);
  });

  it("identifica todos os outros estados como não-terminais", () => {
    const nonTerminal = ORDER_STATUSES.filter((s) => s !== "DELIVERED" && s !== "CANCELLED");
    for (const status of nonTerminal) {
      expect(isTerminalStatus(status)).toBe(false);
    }
  });
});

describe("getNextDriverStatus", () => {
  it("devolve o próximo estado do fluxo normal, ignorando CANCELLED", () => {
    expect(getNextDriverStatus("PENDING")).toBe("SEARCHING_DRIVER");
    expect(getNextDriverStatus("DRIVER_ASSIGNED")).toBe("DRIVER_ARRIVING");
    expect(getNextDriverStatus("IN_TRANSIT")).toBe("DELIVERED");
  });

  it("devolve null para estados terminais", () => {
    expect(getNextDriverStatus("DELIVERED")).toBeNull();
    expect(getNextDriverStatus("CANCELLED")).toBeNull();
  });
});
