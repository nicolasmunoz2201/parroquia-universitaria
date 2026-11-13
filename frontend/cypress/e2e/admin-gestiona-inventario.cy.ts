const INSUMO = `Arroz prueba E2E ${Date.now()}`;

function fechaEnDias(dias: number) {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + dias);
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

function elegirInsumo() {
  cy.contains("#insumoMovimiento option", INSUMO).then((opcion) => {
    cy.get("#insumoMovimiento").select(String(opcion.val()));
  });
}

function pestana(nombre: string) {
  cy.contains('[role="tab"]', nombre).click();
}

describe("Flujo E2E: el administrador gestiona un insumo del comedor", () => {
  after(() => {
    cy.env(["API_URL", "ADMIN_EMAIL", "ADMIN_PASSWORD"]).then((env) => {
      cy.request("POST", `${env.API_URL}/api/auth/login`, { email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD }).then(
        (sesion) => {
          const autorizacion = { Authorization: `Bearer ${sesion.body.token}` };
          cy.request({ url: `${env.API_URL}/api/inventario/insumos`, headers: autorizacion }).then((respuesta) => {
            const insumo = (respuesta.body as { id: string; nombre: string }[]).find((i) => i.nombre === INSUMO);
            if (!insumo) return;
            cy.request({
              method: "PATCH",
              url: `${env.API_URL}/api/inventario/insumos/${insumo.id}/desactivar`,
              headers: autorizacion,
              failOnStatusCode: false,
            });
          });
        }
      );
    });
  });

  it("crea un insumo, registra una entrada y una salida, y ve las alertas", () => {
    cy.env(["ADMIN_EMAIL", "ADMIN_PASSWORD"]).then(({ ADMIN_EMAIL, ADMIN_PASSWORD }) => {
      cy.visit("/");
      cy.get('[aria-label="Abrir menu"]').click();
      cy.contains("button", "Iniciar sesion").click();
      cy.get("#email").type(ADMIN_EMAIL);
      cy.get("#password").type(ADMIN_PASSWORD, { log: false });
      cy.get('button[type="submit"]').click();
    });

    cy.get('[aria-label="Abrir menu"]').click();
    cy.contains("button", "Inventario del comedor").click();
    cy.contains("h1", "Inventario del comedor").should("be.visible");

    cy.get("#nombreInsumo").type(INSUMO);
    cy.get("#categoriaInsumo").select("Abarrotes");
    cy.get("#unidadInsumo").select("Kilogramos (kg)");
    cy.get("#minimoInsumo").clear().type("5");
    cy.contains("button", "Crear insumo").click();
    cy.contains("Insumo creado").should("be.visible");
    cy.contains("li.fila-solicitud", INSUMO).should("contain", "Sin stock");

    pestana("Registrar");
    cy.contains("label", "Entrada").click();
    elegirInsumo();
    cy.get("#cantidadMovimiento").type("10");
    cy.get("#motivoMovimiento").select("Donación");
    cy.get("#vencimientoMovimiento").type(fechaEnDias(3));
    cy.contains("Stock actual: 0 kg → quedará en 10 kg").should("be.visible");
    cy.contains('button[type="submit"]', "Registrar").click();
    cy.get("dialog[open]").should("contain", "Registrar la entrada de 10 kg").contains("button", "Registrar").click();
    cy.contains("Entrada registrada").should("be.visible");

    cy.contains("label", "Salida").click();
    elegirInsumo();
    cy.get("#cantidadMovimiento").type("7");
    cy.get("#motivoMovimiento").select("Consumo");
    cy.contains("Stock actual: 10 kg → quedará en 3 kg").should("be.visible");
    cy.contains('button[type="submit"]', "Registrar").click();
    cy.get("dialog[open]").should("contain", "Registrar la salida de 7 kg").contains("button", "Registrar").click();
    cy.contains("Salida registrada").should("be.visible");

    pestana("Insumos");
    cy.contains("li.fila-solicitud", INSUMO).within(() => {
      cy.contains("Stock: 3 kg").should("be.visible");
      cy.contains("Bajo el mínimo").should("be.visible");
      cy.contains("button", "Eliminar").should("not.exist");
    });
    cy.get(".alerta-stock").should("contain", INSUMO);
    cy.get(".alerta-vencimiento").should("contain", INSUMO);

    pestana("Historial");
    cy.contains("li", INSUMO).should("exist");
  });
});
