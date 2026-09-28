import math

import sympy as sp


def valor_real(solucao):
    """
    Recebe uma solução produzida pelo SymPy.

    Retorna um float se a solução
    for real e finita.

    Caso contrário, retorna None.
    """

    solucao = sp.N(
        solucao
    )

    if solucao.is_real is False:

        return None

    try:

        valor = float(
            solucao
        )

    except (
        TypeError,
        ValueError
    ):

        return None

    if not math.isfinite(
        valor
    ):

        return None

    return valor


def resolver_equacoes_iterativamente(
    equacoes,
    simbolos,
    conhecidos
):
    """
    Estratégia:

    1. recebe grandezas conhecidas;
    2. examina as equações;
    3. procura uma equação que tenha
       apenas uma incógnita;
    4. resolve essa incógnita;
    5. adiciona o resultado aos dados;
    6. repete o processo.
    """

    valores = dict(
        conhecidos
    )

    historico = []

    ambiguidades = {}

    mudou = True

    while mudou:

        mudou = False

        substituicoes = {

            simbolos[nome]:
                valor

            for nome, valor
            in valores.items()

            if nome in simbolos
        }

        for (
            nome_equacao,
            expressao
        ) in equacoes:

            expr = sp.simplify(

                expressao.subs(
                    substituicoes
                )
            )

            desconhecidos = [

                nome

                for nome, simbolo
                in simbolos.items()

                if (
                    nome not in valores
                    and simbolo
                    in expr.free_symbols
                )
            ]

            if len(
                desconhecidos
            ) != 1:

                continue

            nome_alvo = (
                desconhecidos[0]
            )

            simbolo_alvo = (
                simbolos[nome_alvo]
            )

            solucoes = sp.solve(

                sp.Eq(
                    expr,
                    0
                ),

                simbolo_alvo
            )

            candidatos = []

            for solucao in solucoes:

                valor = valor_real(
                    solucao
                )

                if valor is None:
                    continue

                if (
                    nome_alvo == "t"
                    and valor < 0
                ):

                    continue

                candidatos.append(
                    valor
                )

            candidatos_unicos = []

            for valor in candidatos:

                repetido = any(

                    abs(
                        valor - existente
                    ) < 1e-10

                    for existente
                    in candidatos_unicos
                )

                if not repetido:

                    candidatos_unicos.append(
                        valor
                    )

            if len(
                candidatos_unicos
            ) == 1:

                valor = (
                    candidatos_unicos[0]
                )

                valores[
                    nome_alvo
                ] = valor

                historico.append(
                    {
                        "alvo":
                            nome_alvo,

                        "valor":
                            valor,

                        "equacao":
                            nome_equacao,
                    }
                )

                mudou = True

                break

            if len(
                candidatos_unicos
            ) > 1:

                ambiguidades[
                    nome_alvo
                ] = {
                    "equacao":
                        nome_equacao,

                    "candidatos":
                        candidatos_unicos,
                }

    return (
        valores,
        historico,
        ambiguidades
    )