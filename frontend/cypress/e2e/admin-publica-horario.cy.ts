const LUGAR = `Capilla prueba E2E ${Date.now()}`;

function fechaEnDias(dias: number) {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + dias);
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

describe("Flujo E2E: el administrador publica y elimina un horario", () => {
  it("inicia sesión, publica un horario de bautismo y luego lo elimina", () => {
    cy.env(["ADMIN_EMAIL", "ADMIN_PASSWORD"]).then(({ ADMIN_EMAIL, ADMIN_PASSWORD }) => {
      cy.visit("/");
      cy.get('[aria-label="Abrir menu"]').click();
      cy.contains("button", "Iniciar sesion").click();
      cy.get("#email").type(ADMIN_EMAIL);
      cy.get("#password").type(ADMIN_PASSWORD, { log: false });
      cy.get('button[type="submit"]').click();
    });

    cy.get('[aria-label="Abrir menu"]').click();
    cy.contains("button", "Agendamientos").click();
    cy.contains("h1", "Agendamientos").should("be.visible");

    cy.get("#tipoHorario").select("Bautismo");
    cy.get("#fechaHorario").type(fechaEnDias(30));
    cy.get("#horaHorario").select("10:00");
    cy.get("#cuposHorario").clear().type("3");
    cy.get("#lugarHorario").type(LUGAR);
    cy.contains("button", "Publicar horario").click();

    cy.contains("Horario publicado").should("be.visible");
    cy.contains("li", LUGAR).should("contain", "0 de 3 cupos ocupados");

    cy.contains("li", LUGAR).contains("button", "Eliminar").click();
    cy.get("dialog[open]").contains("button", "Eliminar").click();

    cy.contains("Horario eliminado").should("be.visible");
    cy.contains("li", LUGAR).should("not.exist");
  });
});
