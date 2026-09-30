import math

import sympy as sp

from modulos.movimento_1d import Movimento1D, numero_exato, tempo


def _real_float(valor):
    valor_n = sp.N(valor)

    if valor_n.is_real is False:
        return None

    try:
        resultado = float(valor_n)
    except (TypeError, ValueError):
        return None

    if not math.isfinite(resultado):
        return None

    return resultado


def validar_intervalo(movimento, t_inicial, t_final):
    if t_final <= t_inicial:
        raise ValueError("O tempo final deve ser maior que o tempo inicial.")

    if t_inicial < movimento.t_min - 1e-10:
        raise ValueError("O intervalo começa fora do domínio do movimento.")

    if t_final > movimento.t_max + 1e-10:
        raise ValueError("O intervalo termina fora do domínio do movimento.")


def _intersecao_trecho(trecho, t_inicial, t_final):
    inicio = max(float(trecho.inicio), float(t_inicial))
    fim = min(float(trecho.fim), float(t_final))

    if fim < inicio - 1e-10:
        return None

    return inicio, fim


def _resolver_expr(
    expr,
    alvo,
    inicio,
    fim,
    esquerda_aberta=False,
    direita_aberta=False,
):
    """
    Resolve expr(t)=alvo em um intervalo fechado.

    Retorna pontos, intervalos inteiros de solução e uma mensagem de
    limitação quando o SymPy não consegue reduzir o conjunto a algo finito.
    """
    expr_alvo = sp.simplify(expr - numero_exato(alvo))

    dominio = sp.Interval(
        numero_exato(inicio),
        numero_exato(fim),
        left_open=esquerda_aberta,
        right_open=direita_aberta,
    )

    if sp.simplify(expr_alvo) == 0:
        return {
            "pontos": [],
            "intervalos": [dominio],
            "limitacao": None,
        }

    if tempo not in expr_alvo.free_symbols:
        return {
            "pontos": [],
            "intervalos": [],
            "limitacao": None,
        }

    try:
        conjunto = sp.solveset(
            sp.Eq(expr_alvo, 0),
            tempo,
            domain=dominio,
        )
    except Exception as erro:
        conjunto = None
        erro_solveset = str(erro)
    else:
        erro_solveset = None

    pontos = []

    if isinstance(conjunto, sp.FiniteSet):
        for solucao in conjunto:
            valor = _real_float(solucao)
            if valor is not None and inicio - 1e-10 <= valor <= fim + 1e-10:
                pontos.append(valor)

        return {
            "pontos": sorted(set(round(x, 12) for x in pontos)),
            "intervalos": [],
            "limitacao": None,
        }

    if conjunto is sp.EmptySet:
        return {
            "pontos": [],
            "intervalos": [],
            "limitacao": None,
        }

    # Fallback útil para polinômios e expressões algébricas simples.
    try:
        solucoes = sp.solve(sp.Eq(expr_alvo, 0), tempo)
    except Exception:
        solucoes = []

    for solucao in solucoes:
        valor = _real_float(solucao)
        if valor is not None and inicio - 1e-10 <= valor <= fim + 1e-10:
            pontos.append(valor)

    if pontos:
        return {
            "pontos": sorted(set(round(x, 12) for x in pontos)),
            "intervalos": [],
            "limitacao": None,
        }

    if erro_solveset:
        mensagem = f"Falha simbólica ao resolver a equação: {erro_solveset}"
    else:
        mensagem = (
            "A solução simbólica não pôde ser reduzida a um conjunto finito "
            "de instantes neste intervalo."
        )

    return {
        "pontos": [],
        "intervalos": [],
        "limitacao": mensagem,
    }


def resolver_evento(movimento, grandeza, alvo, t_inicial, t_final):
    validar_intervalo(movimento, t_inicial, t_final)

    pontos = []
    intervalos = []
    limitacoes = []

    for indice, trecho in enumerate(movimento.trechos):
        intersecao = _intersecao_trecho(trecho, t_inicial, t_final)
        if intersecao is None:
            continue

        inicio, fim = intersecao
        expr = getattr(trecho, grandeza)

        # Por convenção, uma fronteira entre trechos pertence ao trecho
        # seguinte. Assim evitamos atribuir simultaneamente dois valores
        # diferentes a x, v ou a no mesmo instante.
        direita_aberta = (
            indice < len(movimento.trechos) - 1
            and abs(fim - trecho.fim) < 1e-10
        )

        resultado = _resolver_expr(
            expr,
            alvo,
            inicio,
            fim,
            direita_aberta=direita_aberta,
        )

        pontos.extend(resultado["pontos"])
        intervalos.extend(resultado["intervalos"])

        if resultado["limitacao"]:
            limitacoes.append(resultado["limitacao"])

    pontos_unicos = []

    for ponto in sorted(pontos):
        if not pontos_unicos or abs(ponto - pontos_unicos[-1]) > 1e-9:
            pontos_unicos.append(ponto)

    return {
        "pontos": pontos_unicos,
        "intervalos": intervalos,
        "limitacoes": limitacoes,
    }


def avaliar_estado(movimento, instante):
    return {
        "t": float(instante),
        "x": movimento.avaliar("x", instante),
        "v": movimento.avaliar("v", instante),
        "a": movimento.avaliar("a", instante),
    }


def extremos(movimento, grandeza, t_inicial, t_final):
    """
    Procura extremos globais no intervalo informado.

    Para x(t), pontos estacionários são dados por v(t)=0.
    Para v(t), pontos estacionários são dados por a(t)=0.
    As fronteiras de cada trecho também são candidatas.
    """
    validar_intervalo(movimento, t_inicial, t_final)

    if grandeza == "x":
        derivada = "v"
    elif grandeza == "v":
        derivada = "a"
    else:
        raise ValueError("Extremos só estão implementados para x ou v.")

    candidatos = []
    limitacoes = []

    for trecho in movimento.trechos:
        intersecao = _intersecao_trecho(trecho, t_inicial, t_final)
        if intersecao is None:
            continue

        inicio, fim = intersecao
        candidatos.extend(
            [
                (inicio, trecho),
                (fim, trecho),
            ]
        )

        resultado = _resolver_expr(
            getattr(trecho, derivada),
            0,
            inicio,
            fim,
        )

        for ponto in resultado["pontos"]:
            candidatos.append((ponto, trecho))

        if resultado["intervalos"]:
            # Grandeza constante no trecho: as bordas já representam
            # corretamente seus valores para extremos globais.
            pass

        if resultado["limitacao"]:
            limitacoes.append(resultado["limitacao"])

    avaliados = []

    for instante, trecho in candidatos:
        valor = _real_float(
            getattr(trecho, grandeza).subs(
                tempo,
                numero_exato(instante),
            )
        )

        if valor is not None:
            avaliados.append(
                {
                    "t": float(instante),
                    "valor": valor,
                }
            )

    if not avaliados:
        return {
            "minimo": None,
            "maximo": None,
            "candidatos": [],
            "limitacoes": limitacoes,
        }

    minimo_valor = min(item["valor"] for item in avaliados)
    maximo_valor = max(item["valor"] for item in avaliados)

    minimo = [
        item for item in avaliados
        if abs(item["valor"] - minimo_valor) < 1e-9
    ]
    maximo = [
        item for item in avaliados
        if abs(item["valor"] - maximo_valor) < 1e-9
    ]

    return {
        "minimo": minimo,
        "maximo": maximo,
        "candidatos": avaliados,
        "limitacoes": limitacoes,
    }


def deslocamento_e_velocidade_media(movimento, t_inicial, t_final):
    validar_intervalo(movimento, t_inicial, t_final)

    x1 = _real_float(movimento.avaliar("x", t_inicial))
    x2 = _real_float(movimento.avaliar("x", t_final))

    deslocamento = x2 - x1
    velocidade_media = deslocamento / (t_final - t_inicial)

    return {
        "x_inicial": x1,
        "x_final": x2,
        "deslocamento": deslocamento,
        "velocidade_media": velocidade_media,
    }


def aceleracao_media(movimento, t_inicial, t_final):
    validar_intervalo(movimento, t_inicial, t_final)

    v1 = _real_float(movimento.avaliar("v", t_inicial))
    v2 = _real_float(movimento.avaliar("v", t_final))

    return (v2 - v1) / (t_final - t_inicial)


def distancia_e_velocidade_escalar_media(movimento, t_inicial, t_final):
    validar_intervalo(movimento, t_inicial, t_final)

    descontinuidades_x = [
        aviso
        for aviso in movimento.validar_continuidade()
        if aviso["tipo"] == "posicao"
        and t_inicial < aviso["tempo"] < t_final
    ]

    if descontinuidades_x:
        raise ValueError(
            "A posição é descontínua dentro do intervalo; a distância física "
            "não é bem definida para este modelo."
        )

    distancia = 0.0
    pontos_retorno = []
    limitacoes = []

    for trecho in movimento.trechos:
        intersecao = _intersecao_trecho(trecho, t_inicial, t_final)
        if intersecao is None:
            continue

        inicio, fim = intersecao
        resultado = _resolver_expr(trecho.v, 0, inicio, fim)

        if resultado["limitacao"]:
            limitacoes.append(resultado["limitacao"])
            continue

        pontos = [inicio]

        for raiz in resultado["pontos"]:
            if inicio + 1e-10 < raiz < fim - 1e-10:
                pontos.append(raiz)
                pontos_retorno.append(raiz)

        pontos.append(fim)
        pontos = sorted(set(pontos))

        for t1, t2 in zip(pontos, pontos[1:]):
            x1 = _real_float(trecho.x.subs(tempo, numero_exato(t1)))
            x2 = _real_float(trecho.x.subs(tempo, numero_exato(t2)))
            distancia += abs(x2 - x1)

    if limitacoes:
        return {
            "distancia": None,
            "velocidade_escalar_media": None,
            "pontos_retorno": sorted(set(pontos_retorno)),
            "limitacoes": limitacoes,
        }

    return {
        "distancia": distancia,
        "velocidade_escalar_media": distancia / (t_final - t_inicial),
        "pontos_retorno": sorted(set(pontos_retorno)),
        "limitacoes": [],
    }


def _sinal_expr(
    expr,
    inicio,
    fim,
    operador,
    esquerda_aberta=False,
    direita_aberta=False,
):
    """Determina onde uma expressão é positiva ou negativa no intervalo."""
    dominio = sp.Interval(
        numero_exato(inicio),
        numero_exato(fim),
        left_open=esquerda_aberta,
        right_open=direita_aberta,
    )

    try:
        if operador == ">":
            conjunto = sp.solve_univariate_inequality(
                expr > 0,
                tempo,
                relational=False,
            )
        elif operador == "<":
            conjunto = sp.solve_univariate_inequality(
                expr < 0,
                tempo,
                relational=False,
            )
        else:
            raise ValueError("Operador inválido.")

        return sp.Intersection(conjunto, dominio)

    except Exception:
        return None


def intervalos_de_sinal(movimento, grandeza, t_inicial, t_final):
    validar_intervalo(movimento, t_inicial, t_final)

    positivos = []
    negativos = []
    zeros = []
    limitacoes = []

    for indice, trecho in enumerate(movimento.trechos):
        intersecao = _intersecao_trecho(trecho, t_inicial, t_final)
        if intersecao is None:
            continue

        inicio, fim = intersecao
        expr = getattr(trecho, grandeza)
        direita_aberta = (
            indice < len(movimento.trechos) - 1
            and abs(fim - trecho.fim) < 1e-10
        )

        positivo = _sinal_expr(
            expr,
            inicio,
            fim,
            ">",
            direita_aberta=direita_aberta,
        )
        negativo = _sinal_expr(
            expr,
            inicio,
            fim,
            "<",
            direita_aberta=direita_aberta,
        )
        resultado_zero = _resolver_expr(
            expr,
            0,
            inicio,
            fim,
            direita_aberta=direita_aberta,
        )

        if positivo is None or negativo is None:
            limitacoes.append(
                f"Não foi possível determinar simbolicamente o sinal de {grandeza}(t) "
                f"no trecho [{inicio:g}, {fim:g}]."
            )
        else:
            if positivo is not sp.EmptySet:
                positivos.append(positivo)
            if negativo is not sp.EmptySet:
                negativos.append(negativo)

        zeros.extend(resultado_zero["pontos"])
        zeros.extend(resultado_zero["intervalos"])

        if resultado_zero["limitacao"]:
            limitacoes.append(resultado_zero["limitacao"])

    return {
        "positivos": positivos,
        "negativos": negativos,
        "zeros": zeros,
        "limitacoes": limitacoes,
    }


def comparar_movimentos(
    movimento1,
    movimento2,
    grandeza,
    t_inicial,
    t_final,
):
    inicio_global = max(
        float(t_inicial),
        movimento1.t_min,
        movimento2.t_min,
    )
    fim_global = min(
        float(t_final),
        movimento1.t_max,
        movimento2.t_max,
    )

    if fim_global <= inicio_global:
        raise ValueError("Os movimentos não possuem domínio comum nesse intervalo.")

    pontos = []
    intervalos = []
    limitacoes = []

    for trecho1 in movimento1.trechos:
        for trecho2 in movimento2.trechos:
            inicio = max(inicio_global, trecho1.inicio, trecho2.inicio)
            fim = min(fim_global, trecho1.fim, trecho2.fim)

            if fim < inicio - 1e-10:
                continue

            expr1 = getattr(trecho1, grandeza)
            expr2 = getattr(trecho2, grandeza)
            resultado = _resolver_expr(expr1 - expr2, 0, inicio, fim)

            pontos.extend(resultado["pontos"])
            intervalos.extend(resultado["intervalos"])

            if resultado["limitacao"]:
                limitacoes.append(resultado["limitacao"])

    pontos_unicos = []

    for ponto in sorted(pontos):
        if not pontos_unicos or abs(ponto - pontos_unicos[-1]) > 1e-9:
            pontos_unicos.append(ponto)

    return {
        "pontos": pontos_unicos,
        "intervalos": intervalos,
        "limitacoes": limitacoes,
        "inicio": inicio_global,
        "fim": fim_global,
    }
