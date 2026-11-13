const PAUSA_MS = 800;
const PAUSA_TECLA_MS = 80;

const ACCIONES = ["visit", "click", "select", "clear", "selectFile"];

type Original = (...args: unknown[]) => unknown;
type Sobrescribir = (nombre: string, fn: (original: Original, ...args: unknown[]) => unknown) => void;

function esperar(resultado: unknown) {
  return new Promise((resolve) => setTimeout(() => resolve(resultado), PAUSA_MS));
}

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
