const SUFIJO = Date.now();
const ORGANISMO = `Pastoral prueba E2E ${SUFIJO}`;
const TITULO = `Retiro de jóvenes E2E ${SUFIJO}`;
const DIA = 24 * 60 * 60 * 1000;
let organismoId = "";
let actividadId = "";

function tokenDe(apiUrl: string, email: string, password: string) {
  return cy
    .request("POST", `${apiUrl}/api/auth/login`, { email, password })
    .then((respuesta) => respuesta.body.token as string);
}

describe("Flujo E2E: un feligrés se inscribe en una actividad y avisa que no podrá asistir", () => {
  before(() => {
    cy.env(["API_URL", "ADMIN_EMAIL", "ADMIN_PASSWORD", "FELIGRES_EMAIL", "FELIGRES_PASSWORD"]).then((env) => {
      cy.request({
        method: "POST",
        url: `${env.API_URL}/api/auth/registro`,
        body: { nombre: "Feligrés E2E", email: env.FELIGRES_EMAIL, password: env.FELIGRES_PASSWORD },
        failOnStatusCode: false,
      });
      tokenDe(env.API_URL, env.ADMIN_EMAIL, env.ADMIN_PASSWORD).then((token) => {
        const autorizacion = { Authorization: `Bearer ${token}` };
        cy.request({
          method: "POST",
          url: `${env.API_URL}/api/organismos`,
          headers: autorizacion,
          body: { nombre: ORGANISMO, descripcion: "Organismo creado por la prueba E2E" },
        }).then((organismo) => {
          organismoId = organismo.body.id;
          cy.request({
            method: "POST",
            url: `${env.API_URL}/api/actividades`,
            headers: autorizacion,
            body: {
              titulo: TITULO,
              descripcion: "Retiro de un día en la parroquia",
              inicio: new Date(Date.now() + 5 * DIA).toISOString(),
              cupos: 2,
              lugar: "Salón parroquial",
              organismoId,
            },
          }).then((actividad) => {
            actividadId = actividad.body.id;
          });
        });
      });
    });
  });

  after(() => {
    cy.env(["API_URL", "ADMIN_EMAIL", "ADMIN_PASSWORD"]).then((env) => {
      tokenDe(env.API_URL, env.ADMIN_EMAIL, env.ADMIN_PASSWORD).then((token) => {
        const autorizacion = { Authorization: `Bearer ${token}` };
        cy.request({
          method: "PATCH",
          url: `${env.API_URL}/api/actividades/${actividadId}/cancelar`,
          headers: autorizacion,
          failOnStatusCode: false,
        });
        cy.request({
          method: "PATCH",
          url: `${env.API_URL}/api/organismos/${organismoId}/desactivar`,
          headers: autorizacion,
          failOnStatusCode: false,
        });
      });
    });
  });

  it("inicia sesión, se inscribe, ve su inscripción pendiente y libera el cupo", () => {
    cy.env(["FELIGRES_EMAIL", "FELIGRES_PASSWORD"]).then(({ FELIGRES_EMAIL, FELIGRES_PASSWORD }) => {
      cy.visit("/");
      cy.get('[aria-label="Abrir menu"]').click();
      cy.contains("button", "Iniciar sesion").click();
      cy.get("#email").type(FELIGRES_EMAIL);
      cy.get("#password").type(FELIGRES_PASSWORD, { log: false });
      cy.get('button[type="submit"]').click();
    });

    cy.get('[aria-label="Abrir menu"]').click();
    cy.contains("button", /^Actividades$/).click();
    cy.contains("h1", "Actividades").should("be.visible");

    cy.contains("li.tarjeta-actividad", TITULO).within(() => {
      cy.contains("2 cupos").should("be.visible");
      cy.contains("button", "Inscribirme").click();
    });
    cy.contains("Inscripción enviada").should("be.visible");
    cy.contains("li.tarjeta-actividad", TITULO).should("contain", "Pendiente de aprobación");
    cy.contains("li.fila-solicitud", TITULO).should("contain", "Pendiente de aprobación");

    cy.contains("li.fila-solicitud", TITULO).contains("button", "No podré asistir").click();
    cy.get("dialog[open]").contains("button", "Avisar").click();

    cy.contains("Avisamos que no podrás asistir").should("be.visible");
    cy.contains("li.fila-solicitud", TITULO).should("contain", "Cancelada");
  });
});
