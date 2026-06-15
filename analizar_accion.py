import numpy as np


def analizar_accion(precios):

    retornos = []

    for i in range(1, len(precios)):
        retorno = (precios[i] / precios[i-1]) - 1
        retornos.append(retorno)

    retornos = np.array(retornos)

    retorno_acumulado = (precios[-1] / precios[0]) - 1
    retorno_promedio = np.mean(retornos)
    volatilidad = np.std(retornos)

    if volatilidad != 0:
        sharpe = retorno_promedio / volatilidad
    else:
        sharpe = 0

    if retorno_acumulado > 0 and sharpe > 0.05:
        conclusion = "Interesante"
    elif retorno_acumulado > 0 and sharpe <= 0.05:
        conclusion = "Neutral, porque subio pero con bastante riesgo"
    else:
        conclusion = "Evitar o revisar mejor, porque tuvo retorno negativo"

    print("Retorno acumulado:", retorno_acumulado)
    print("Retorno promedio:", retorno_promedio)
    print("Volatilidad:", volatilidad)
    print("Sharpe simple:", sharpe)
    print("Conclusion:", conclusion)

    return retorno_acumulado, retorno_promedio, volatilidad, sharpe, conclusion
