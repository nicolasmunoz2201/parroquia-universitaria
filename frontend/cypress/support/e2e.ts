const PAUSA_MS = 800;
const PAUSA_TECLA_MS = 80;

const ACCIONES = ["visit", "click", "select", "clear", "selectFile"];

type Original = (...args: unknown[]) => unknown;
type Sobrescribir = (nombre: string, fn: (original: Original, ...args: unknown[]) => unknown) => void;

function esperar(resultado: unknown) {
  return new Promise((resolve) => setTimeout(() => resolve(resultado), PAUSA_MS));
}

declare global {
  namespace Cypress {
    interface Chainable {
      irA(opcion: string, grupo?: string): Chainable<void>;
    }
  }
}

function textoExacto(texto: string) {
  return new RegExp(`^${texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`);
}

Cypress.Commands.add("irA", (opcion: string, grupo?: string) => {
  if (grupo) {
    cy.get(`nav.menu-superior [data-menu="${grupo}"]`).click();
    cy.get("nav.menu-superior .menu-desplegable").contains("button", textoExacto(opcion)).click();
    return;
  }
  cy.get("nav.menu-superior").contains("button", textoExacto(opcion)).click();
});

if (Cypress.config("isInteractive")) {
  const sobrescribir = Cypress.Commands.overwrite as Sobrescribir;
  for (const accion of ACCIONES) {
    sobrescribir(accion, (original, ...args) => esperar(original(...args)));
  }
  sobrescribir("type", (original, sujeto, texto, opciones) =>
    esperar(original(sujeto, texto, { delay: PAUSA_TECLA_MS, ...(opciones ?? {}) }))
  );
}

export {};
