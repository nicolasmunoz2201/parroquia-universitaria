const SUFIJO = Date.now();
const TITULO = `Inauguración del templo E2E ${SUFIJO}`;
const TESTIMONIO = "Recuerdo la primera misa con la capilla llena de estudiantes.";

function tokenAdmin(env: Record<string, string>) {
  return cy
    .request("POST", `${env.API_URL}/api/auth/login`, { email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD })
    .then((respuesta) => respuesta.body.token as string);
}

function irA(opcion: string | RegExp) {
  cy.get('[aria-label="Abrir menu"]').click();
  cy.contains("button", opcion).click();
}

describe("Flujo E2E: el administrador arma la memoria histórica", () => {
  after(() => {
    cy.env(["API_URL", "ADMIN_EMAIL", "ADMIN_PASSWORD"]).then((env) => {
      cy.request(`${env.API_URL}/api/memoria/hitos`).then((respuesta) => {
        const hito = respuesta.body.find((h: { titulo: string }) => h.titulo === TITULO);
        if (!hito) return;
        tokenAdmin(env).then((token) => {
          cy.request({
            method: "DELETE",
            url: `${env.API_URL}/api/memoria/hitos/${hito.id}`,
            headers: { Authorization: `Bearer ${token}` },
            failOnStatusCode: false,
          });
        });
      });
    });
  });

  it("crea un hito con foto, le agrega un testimonio, lo ve en la línea de tiempo y quita la foto", () => {
    cy.env(["ADMIN_EMAIL", "ADMIN_PASSWORD"]).then(({ ADMIN_EMAIL, ADMIN_PASSWORD }) => {
      cy.visit("/");
      irA("Iniciar sesion");
      cy.get("#email").type(ADMIN_EMAIL);
      cy.get("#password").type(ADMIN_PASSWORD, { log: false });
      cy.get('button[type="submit"]').click();
    });

    irA("Gestionar memoria");
    cy.get("#tituloHito").type(TITULO);
    cy.get("#fechaHito").type("1975-03-19");
    cy.get("#descripcionHito").type("Se bendice el templo de la Parroquia Universitaria.");
    cy.get("#fotosHito").selectFile("cypress/fixtures/foto-prueba.png", { force: true });
    cy.contains("foto-prueba.png").should("be.visible");
    cy.contains("button", "Agregar hito").click();
    cy.contains("Hito agregado a la línea de tiempo").should("be.visible");

    cy.contains("li.fila-hito", TITULO).within(() => {
      cy.contains("1 foto(s) · 0 testimonio(s)").should("be.visible");
      cy.contains("button", "Testimonios").click();
      cy.get('input[id^="autor-"]').type("María González, catequista");
      cy.get('textarea[id^="testimonio-"]').type(TESTIMONIO);
      cy.contains("button", "Agregar testimonio").click();
    });
    cy.contains("Testimonio agregado").should("be.visible");
    cy.contains("li.fila-hito", TITULO).should("contain", "1 testimonio(s)");

    irA("Memoria histórica");
    cy.contains("h2", "1975").should("be.visible");
    cy.contains("article.hito-tarjeta", TITULO).within(() => {
      cy.contains("19 de marzo de 1975").should("be.visible");
      cy.get(".hito-fotos img").should("be.visible");
      cy.contains("blockquote", TESTIMONIO).should("contain", "María González, catequista");
    });

    irA("Gestionar memoria");
    cy.contains("li.fila-hito", TITULO).contains("button", "Editar").click();
    cy.contains("Foto actual 1").should("be.visible");
    cy.get('[aria-label="Quitar foto actual 1"]').click();
    cy.contains("Foto actual 1").should("not.exist");
    cy.contains("button", "Guardar cambios").click();
    cy.contains("Hito actualizado").should("be.visible");
    cy.contains("li.fila-hito", TITULO).should("contain", "0 foto(s) · 1 testimonio(s)");
  });
});
