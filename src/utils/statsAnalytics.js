exports.calcularComposicionCorporal = (stats) => {
  const { peso, altura, grasa } = stats.medidas

  if (!peso || !altura || !grasa) return null

  const alturaMetros = altura / 100
  const imc = peso / (alturaMetros * alturaMetros)
  const masaGrasa = (peso * grasa) / 100
  const masaMagra = peso - masaGrasa

  return {
    imc: imc.toFixed(2),
    masaGrasa: masaGrasa.toFixed(2),
    masaMagra: masaMagra.toFixed(2),
    clasificacionIMC: clasificarIMC(imc)
  }
}

const clasificarIMC = (imc) => {
  if (imc < 18.5) return 'Bajo peso'
  if (imc < 25) return 'Peso normal'
  if (imc < 30) return 'Sobrepeso'
  if (imc < 35) return 'Obesidad grado I'
  if (imc < 40) return 'Obesidad grado II'
  return 'Obesidad grado III'
}

exports.predecirTendencia = (historialMedidas, medida, diasFuturos = 30) => {
  if (historialMedidas.length < 3) return null

  const medidas = [...historialMedidas].sort(
    (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
  )

  const valores = medidas.map((m) => m.medidas[medida])
  const fechas = medidas.map((m) => new Date(m.fecha).getTime())

  const n = valores.length
  const sumX = fechas.reduce((a, b) => a + b, 0)
  const sumY = valores.reduce((a, b) => a + b, 0)
  const sumXY = fechas.reduce((sum, x, i) => sum + x * valores[i], 0)
  const sumX2 = fechas.reduce((sum, x) => sum + x * x, 0)

  const pendiente = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
  const interseccion = (sumY - pendiente * sumX) / n

  const ultimaFecha = fechas[fechas.length - 1]
  const fechaFutura = ultimaFecha + diasFuturos * 24 * 60 * 60 * 1000
  const valorFuturo = pendiente * fechaFutura + interseccion

  return {
    valorActual: valores[valores.length - 1],
    valorFuturo: valorFuturo.toFixed(2),
    cambioEstimado: (valorFuturo - valores[valores.length - 1]).toFixed(2),
    fechaEstimacion: new Date(fechaFutura).toISOString().split('T')[0]
  }
}

exports.calcularRitmoProgreso = (objetivo, historialMedidas) => {
  if (historialMedidas.length < 2) return null

  const medidas = [...historialMedidas].sort(
    (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
  )

  const valores = medidas.map((m) => m.medidas[objetivo.medida])
  const fechas = medidas.map((m) => new Date(m.fecha).getTime())

  const ultimoValor = valores[valores.length - 1]
  const primerValor = valores[0]
  const diasTranscurridos =
    (fechas[fechas.length - 1] - fechas[0]) / (1000 * 60 * 60 * 24)

  if (diasTranscurridos === 0) return null

  const tasaCambioActual = (ultimoValor - primerValor) / diasTranscurridos

  const hoy = new Date().getTime()
  const fechaObjetivo = new Date(objetivo.fechaObjetivo).getTime()
  const diasRestantes = Math.max(
    0,
    (fechaObjetivo - hoy) / (1000 * 60 * 60 * 24)
  )

  const cambioNecesario = objetivo.valorObjetivo - ultimoValor
  const tasaCambioNecesaria =
    diasRestantes > 0 ? cambioNecesario / diasRestantes : 0

  const ritmoSuficiente =
    (cambioNecesario > 0 &&
      tasaCambioActual > 0 &&
      tasaCambioActual >= tasaCambioNecesaria) ||
    (cambioNecesario < 0 &&
      tasaCambioActual < 0 &&
      tasaCambioActual <= tasaCambioNecesaria)

  return {
    tasaCambioActual: tasaCambioActual.toFixed(4),
    tasaCambioNecesaria: tasaCambioNecesaria.toFixed(4),
    diasRestantes: Math.ceil(diasRestantes),
    ritmoSuficiente,
    estimacionDiasParaCompletar:
      tasaCambioActual !== 0
        ? Math.ceil(cambioNecesario / tasaCambioActual)
        : null
  }
}
