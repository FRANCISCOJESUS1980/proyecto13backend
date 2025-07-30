const nodemailer = require('nodemailer')

let transporter = null

const getTransporter = () => {
  if (transporter) return transporter

  if (
    !process.env.EMAIL_HOST ||
    !process.env.EMAIL_USER ||
    !process.env.EMAIL_PASSWORD
  ) {
    console.error('Error: Variables de entorno para email no configuradas')
    return null
  }

  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD.replace(/\s/g, '')
    },
    tls: {
      rejectUnauthorized: false
    }
  })

  return transporter
}

const verificarConexion = async () => {
  try {
    const transport = getTransporter()
    if (!transport) return false

    await transport.verify()

    return true
  } catch (error) {
    console.error('❌ Error en la conexión SMTP:', error.message)
    return false
  }
}

exports.enviarEmail = async ({ destinatario, asunto, contenido }) => {
  try {
    if (!destinatario || !asunto || !contenido) {
      throw new Error('Faltan parámetros para enviar el email')
    }

    const transport = getTransporter()
    if (!transport) {
      throw new Error('No se pudo inicializar el transporte de correo')
    }

    const conexionOk = await verificarConexion()
    if (!conexionOk) {
      throw new Error('No se pudo establecer conexión con el servidor SMTP')
    }

    const mailOptions = {
      from: `"AderCrossFit" <${
        process.env.EMAIL_FROM || process.env.EMAIL_USER
      }>`,
      to: destinatario,
      subject: asunto,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #333;">AderCrossFit</h2>
          </div>
          ${contenido}
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #666; font-size: 12px;">
            <p>&copy; ${new Date().getFullYear()} AderCrossFit. Todos los derechos reservados.</p>
          </div>
        </div>
      `
    }

    const info = await transport.sendMail(mailOptions)

    return info
  } catch (error) {
    console.error(`❌ Error al enviar email a ${destinatario}:`, error.message)
    throw error
  }
}

exports.verificarConexion = verificarConexion
