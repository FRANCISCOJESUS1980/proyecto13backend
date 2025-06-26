const obtenerHoraClase = (classItem) => {
  try {
    if (!classItem.horario) return null

    let fechaClase

    if (classItem.esFechaEspecifica && classItem.fecha) {
      fechaClase = new Date(classItem.fecha)
    } else {
      const hoy = new Date()
      const diasSemana = [
        'domingo',
        'lunes',
        'martes',
        'miércoles',
        'jueves',
        'viernes',
        'sábado'
      ]
      const diaSemanaHoy = diasSemana[hoy.getDay()]

      if (classItem.diaSemana === diaSemanaHoy) {
        fechaClase = new Date()
      } else {
        fechaClase = obtenerFechaPorDiaSemana(classItem.diaSemana)
      }
    }

    if (!fechaClase) return null

    const [horas, minutos] = classItem.horario.split(':')
    fechaClase.setHours(
      Number.parseInt(horas, 10),
      Number.parseInt(minutos, 10),
      0,
      0
    )

    return fechaClase
  } catch (error) {
    console.error('Error al obtener hora de clase:', error)
    return null
  }
}

const obtenerFechaPorDiaSemana = (diaSemana) => {
  if (!diaSemana) return null

  const diasSemana = [
    'domingo',
    'lunes',
    'martes',
    'miércoles',
    'jueves',
    'viernes',
    'sábado'
  ]
  const diaIndice = diasSemana.indexOf(diaSemana.toLowerCase())

  if (diaIndice === -1) return null

  const hoy = new Date()
  const diaActual = hoy.getDay()

  let diasHasta = diaIndice - diaActual
  if (diasHasta <= 0) diasHasta += 7

  const fechaObjetivo = new Date(hoy)
  fechaObjetivo.setDate(hoy.getDate() + diasHasta)

  return fechaObjetivo
}

const esHoy = (fecha) => {
  const hoy = new Date()
  return (
    fecha.getDate() === hoy.getDate() &&
    fecha.getMonth() === hoy.getMonth() &&
    fecha.getFullYear() === hoy.getFullYear()
  )
}

const esDiaPasado = (fecha) => {
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const fechaComparar = new Date(fecha)
  fechaComparar.setHours(0, 0, 0, 0)
  return fechaComparar < hoy
}

const validarHorarioClase = (classItem, esAdmin) => {
  if (esAdmin) return { valido: true }

  const horaActual = new Date()
  const horaClase = obtenerHoraClase(classItem)

  if (!horaClase) return { valido: true }

  if (esDiaPasado(horaClase)) {
    return {
      valido: false,
      mensaje: 'No puedes inscribirte a una clase de un día pasado'
    }
  }

  if (esHoy(horaClase)) {
    const diferenciaMinutos = (horaActual - horaClase) / (1000 * 60)
    if (diferenciaMinutos > 10) {
      return {
        valido: false,
        mensaje:
          'No puedes inscribirte después de 10 minutos del inicio de la clase'
      }
    }
  }

  return { valido: true }
}

const validarCancelacionClase = (classItem, esAdmin) => {
  if (esAdmin) return { valido: true }

  const horaActual = new Date()
  const horaClase = obtenerHoraClase(classItem)

  if (!horaClase) return { valido: true }

  if (esDiaPasado(horaClase)) {
    return {
      valido: false,
      mensaje: 'No puedes cancelar una clase de un día pasado'
    }
  }

  if (esHoy(horaClase)) {
    const diferenciaHoras = (horaClase - horaActual) / (1000 * 60 * 60)
    if (diferenciaHoras < 2) {
      return {
        valido: false,
        mensaje:
          'No puedes cancelar tu inscripción con menos de 2 horas de antelación'
      }
    }
  }

  return { valido: true }
}

module.exports = {
  obtenerHoraClase,
  obtenerFechaPorDiaSemana,
  esHoy,
  esDiaPasado,
  validarHorarioClase,
  validarCancelacionClase
}
