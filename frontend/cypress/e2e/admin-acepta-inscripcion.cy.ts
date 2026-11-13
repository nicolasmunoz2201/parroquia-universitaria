const SUFIJO = Date.now();
const ORGANISMO = `Coro prueba E2E ${SUFIJO}`;
const TITULO = `Ensayo del coro E2E ${SUFIJO}`;
const HORA = 60 * 60 * 1000;
let organismoId = "";
let actividadId = "";

function tokenDe(apiUrl: string, email: string, password: string) {
  return cy
    .request("POST", `${apiUrl}/api/auth/login`, { email, password })
    .then((respuesta) => respuesta.body.token as string);
}

function iniciarSesion(email: string, password: string) {
  cy.visit("/");
  cy.get('[aria-label="Abrir menu"]').click();
  cy.contains("button", "Iniciar sesion").click();
  cy.get("#email").type(email);
  cy.get("#password").type(password, { log: false });
  cy.get('button[type="submit"]').click();
}

function irA(opcion: string | RegExp) {
  cy.get('[aria-label="Abrir menu"]').click();
  cy.contains("button", opcion).click();
}

function cerrarSesion() {
  irA("Cerrar sesion");
}

describe("Flujo E2E: el administrador acepta una inscripción y el feligrés confirma su asistencia", () => {
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
              descripcion: "Ensayo abierto para nuevos integrantes",
              inicio: new Date(Date.now() + 36 * HORA).toISOString(),
              cupos: 5,
              lugar: "Templo parroquial",
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

  it("el feligrés se inscribe, el admin acepta y el feligrés confirma su asistencia", () => {
    cy.env(["ADMIN_EMAIL", "ADMIN_PASSWORD", "FELIGRES_EMAIL", "FELIGRES_PASSWORD"]).then((env) => {
      iniciarSesion(env.FELIGRES_EMAIL, env.FELIGRES_PASSWORD);
      irA(/^Actividades$/);
      cy.contains("li.tarjeta-actividad", TITULO).contains("button", "Inscribirme").click();
      cy.contains("Inscripción enviada").should("be.visible");
      cy.contains("li.fila-solicitud", TITULO).should("contain", "Pendiente de aprobación");
      cerrarSesion();

      iniciarSesion(env.ADMIN_EMAIL, env.ADMIN_PASSWORD);
      irA("Gestionar actividades");
      cy.contains("li.fila-actividad", TITULO).within(() => {
        cy.contains("1 de 5 cupos ocupados").should("be.visible");
        cy.contains("button", "Inscritos").click();
        cy.contains("Pendientes de aprobación (1)").should("be.visible");
        cy.contains("li", env.FELIGRES_EMAIL).contains("button", "Aceptar").click();
      });
      cy.contains("Inscripción aceptada").should("be.visible");
      cy.contains("li.fila-actividad", TITULO).within(() => {
        cy.contains("Aceptadas y confirmadas (1)").should("be.visible");
        cy.contains("li", env.FELIGRES_EMAIL).should("contain", "Aceptada, falta confirmar");
      });
      cerrarSesion();

      iniciarSesion(env.FELIGRES_EMAIL, env.FELIGRES_PASSWORD);
      irA(/^Actividades$/);
      cy.contains("li.fila-solicitud", TITULO).within(() => {
        cy.contains("Aceptada, falta confirmar").should("be.visible");
        cy.contains("button", "Confirmar asistencia").click();
      });
      cy.contains("Tu asistencia quedó confirmada").should("be.visible");
      cy.contains("li.fila-solicitud", TITULO).should("contain", "Asistencia confirmada");
      cerrarSesion();

      iniciarSesion(env.ADMIN_EMAIL, env.ADMIN_PASSWORD);
      irA("Gestionar actividades");
      cy.contains("li.fila-actividad", TITULO).within(() => {
        cy.contains("button", "Inscritos").click();
        cy.contains("li", env.FELIGRES_EMAIL).should("contain", "Asistencia confirmada");
      });
    });
  });
});
