const SUFIJO = Date.now();
const ORGANISMO = `Organismo prueba E2E ${SUFIJO}`;
const TITULO = `Jornada solidaria E2E ${SUFIJO}`;
let organismoId = "";

function tokenAdmin(env: Record<string, string>) {
  return cy
    .request("POST", `${env.API_URL}/api/auth/login`, { email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD })
    .then((respuesta) => respuesta.body.token as string);
}

describe("Flujo E2E: el administrador publica una noticia con foto", () => {
  before(() => {
    cy.env(["API_URL", "ADMIN_EMAIL", "ADMIN_PASSWORD"]).then((env) => {
      tokenAdmin(env).then((token) => {
        cy.request({
          method: "POST",
          url: `${env.API_URL}/api/organismos`,
          headers: { Authorization: `Bearer ${token}` },
          body: { nombre: ORGANISMO, descripcion: "Organismo creado por la prueba E2E" },
        }).then((respuesta) => {
          organismoId = respuesta.body.id;
        });
      });
    });
  });

  after(() => {
    cy.env(["API_URL", "ADMIN_EMAIL", "ADMIN_PASSWORD"]).then((env) => {
      tokenAdmin(env).then((token) => {
        cy.request({
          method: "DELETE",
          url: `${env.API_URL}/api/organismos/${organismoId}`,
          headers: { Authorization: `Bearer ${token}` },
          failOnStatusCode: false,
        });
      });
    });
  });

  it("inicia sesión, publica con una foto, la ve en Inicio y luego la elimina", () => {
    cy.env(["ADMIN_EMAIL", "ADMIN_PASSWORD"]).then(({ ADMIN_EMAIL, ADMIN_PASSWORD }) => {
      cy.visit("/");
      cy.get('[aria-label="Abrir menu"]').click();
      cy.contains("button", "Iniciar sesion").click();
      cy.get("#email").type(ADMIN_EMAIL);
      cy.get("#password").type(ADMIN_PASSWORD, { log: false });
      cy.get('button[type="submit"]').click();
    });

    cy.get('[aria-label="Abrir menu"]').click();
    cy.contains("button", "Gestionar publicaciones").click();

    cy.get("#titulo").type(TITULO);
    cy.get("#contenido").type("Te invitamos a la jornada solidaria de este sábado en el comedor.");
    cy.get("#organismo").select(ORGANISMO);
    cy.get("#imagen").selectFile("cypress/fixtures/foto-prueba.png", { force: true });
    cy.contains("foto-prueba.png").should("be.visible");

    cy.contains("button", "Publicar").click();
    cy.get("dialog[open]").should("contain", "con 1 foto(s)").contains("button", "Publicar").click();
    cy.contains("Publicacion creada con exito").should("be.visible");
    cy.contains("li", TITULO).should("contain", ORGANISMO);

    cy.get('[aria-label="Abrir menu"]').click();
    cy.contains("button", "Inicio").click();
    cy.contains("article", TITULO).within(() => {
      cy.contains(ORGANISMO).should("be.visible");
      cy.get("img").should("be.visible");
    });

    cy.get('[aria-label="Abrir menu"]').click();
    cy.contains("button", "Gestionar publicaciones").click();
    cy.contains("li", TITULO).contains("button", "Eliminar").click();
    cy.get("dialog[open]").contains("button", "Eliminar").click();
    cy.contains("Publicacion eliminada con exito").should("be.visible");
    cy.contains("li", TITULO).should("not.exist");
  });
});
