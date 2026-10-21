const LUGAR = `Hospital prueba E2E ${Date.now()}`;
const BENEFICIARIO = `Paciente E2E ${Date.now()}`;
let horarioId = "";

function tokenDe(apiUrl: string, email: string, password: string) {
  return cy
    .request("POST", `${apiUrl}/api/auth/login`, { email, password })
    .then((respuesta) => respuesta.body.token as string);
}

describe("Flujo E2E: un feligrés agenda y cancela un sacramento", () => {
  before(() => {
    cy.env(["API_URL", "ADMIN_EMAIL", "ADMIN_PASSWORD", "FELIGRES_EMAIL", "FELIGRES_PASSWORD"]).then((env) => {
      cy.request({
        method: "POST",
        url: `${env.API_URL}/api/auth/registro`,
        body: { nombre: "Feligrés E2E", email: env.FELIGRES_EMAIL, password: env.FELIGRES_PASSWORD },
        failOnStatusCode: false,
      });
      const manana = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      tokenDe(env.API_URL, env.ADMIN_EMAIL, env.ADMIN_PASSWORD).then((token) => {
        cy.request({
          method: "POST",
          url: `${env.API_URL}/api/sacramentos/horarios`,
          headers: { Authorization: `Bearer ${token}` },
          body: { tipo: "UNCION_ENFERMOS", inicio: manana, cupos: 2, lugar: LUGAR },
        }).then((respuesta) => {
          horarioId = respuesta.body.id;
        });
      });
    });
  });

  after(() => {
    cy.env(["API_URL", "ADMIN_EMAIL", "ADMIN_PASSWORD"]).then((env) => {
      tokenDe(env.API_URL, env.ADMIN_EMAIL, env.ADMIN_PASSWORD).then((token) => {
        cy.request({
          method: "PATCH",
          url: `${env.API_URL}/api/sacramentos/horarios/${horarioId}/desactivar`,
          headers: { Authorization: `Bearer ${token}` },
        });
      });
    });
  });

  it("inicia sesión, reserva una hora de Unción de los enfermos y la cancela", () => {
    cy.env(["FELIGRES_EMAIL", "FELIGRES_PASSWORD"]).then(({ FELIGRES_EMAIL, FELIGRES_PASSWORD }) => {
      cy.visit("/");
      cy.get('[aria-label="Abrir menu"]').click();
      cy.contains("button", "Iniciar sesion").click();
      cy.get("#email").type(FELIGRES_EMAIL);
      cy.get("#password").type(FELIGRES_PASSWORD, { log: false });
      cy.get('button[type="submit"]').click();
    });

    cy.get('[aria-label="Abrir menu"]').click();
    cy.contains("button", "Agendar sacramentos").click();

    cy.get("#tipoSacramento").select("Unción de los enfermos");
    cy.contains("label", LUGAR).click();
    cy.get("#nombreBeneficiario").type(BENEFICIARIO);
    cy.contains("button", "Solicitar hora").click();
    cy.get("dialog[open]").contains("button", "Solicitar").click();

    cy.contains("Solicitud enviada").should("be.visible");
    cy.contains("li", BENEFICIARIO).should("contain", "Pendiente");

    cy.contains("li", BENEFICIARIO).contains("button", "Cancelar").click();
    cy.get("dialog[open]").contains("button", "Cancelar solicitud").click();

    cy.contains("Solicitud cancelada").should("be.visible");
    cy.contains("li", BENEFICIARIO).should("contain", "Cancelada");
  });
});
