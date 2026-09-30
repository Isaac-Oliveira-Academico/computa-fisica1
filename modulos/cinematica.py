import sympy as sp

from core.entrada import (
    escolher_opcao,
    ler_float,
    ler_float_opcional,
    ler_int,
    ler_sim_nao,
    pausar,
)
from core.solver import resolver_equacoes_iterativamente
from modulos.eventos_cinematica import (
    aceleracao_media,
    avaliar_estado,
    comparar_movimentos,
    distancia_e_velocidade_escalar_media,
    deslocamento_e_velocidade_media,
    extremos,
    intervalos_de_sinal,
    resolver_evento,
)
from modulos.graficos_cinematica import (
    gerar_grafico_comparativo,
    gerar_graficos_movimento,
)
from modulos.movimento_1d import (
    Movimento1D,
    TrechoMovimento,
    construir_movimento,
    criar_movimento_um_trecho,
    numero_exato,
    tempo,
)


# ============================================================
# GRANDEZAS E EQUAÇÕES DO MUV
# ============================================================

x0 = sp.symbols("x0", real=True)
x = sp.symbols("x", real=True)
v0 = sp.symbols("v0", real=True)
v = sp.symbols("v", real=True)
a = sp.symbols("a", real=True)
t = tempo

SIMBOLOS = {
    "x0": x0,
    "x": x,
    "v0": v0,
    "v": v,
    "a": a,
    "t": t,
}

EQUACOES = [
    (
        "v = v0 + a*t",
        v - v0 - a * t,
    ),
    (
        "x = x0 + v0*t + 1/2*a*t²",
        x - x0 - v0 * t - sp.Rational(1, 2) * a * t**2,
    ),
    (
        "v² = v0² + 2*a*(x-x0)",
        v**2 - v0**2 - 2 * a * (x - x0),
    ),
    (
        "x = x0 + ((v0+v)/2)*t",
        x - x0 - ((v0 + v) / 2) * t,
    ),
]


def validar_dados_muv(conhecidos, tolerancia=1e-8):
    substituicoes = {
        SIMBOLOS[nome]: valor
        for nome, valor in conhecidos.items()
        if nome in SIMBOLOS
    }

    inconsistencias = []

    for nome_equacao, expressao in EQUACOES:
        faltantes = expressao.free_symbols - set(substituicoes.keys())

        if faltantes:
            continue

        residual = float(sp.N(expressao.subs(substituicoes)))

        if abs(residual) > tolerancia:
            inconsistencias.append(
                {
                    "equacao": nome_equacao,
                    "residual": residual,
                }
            )

    return inconsistencias


# ============================================================
# ENTRADA DE EXPRESSÕES E MODELOS DE MOVIMENTO
# ============================================================


def ler_expressao(nome):
    """Lê expressão simbólica em função de t."""
    texto = input(
        f"\nDigite {nome}(t) em função de t.\n"
        f"Exemplo: 4*t**2 + 3*t - 2\n"
        f"{nome}(t) = "
    ).strip()

    texto = texto.replace("^", "**")

    permitidas = {
        "t": tempo,
        "sin": sp.sin,
        "cos": sp.cos,
        "tan": sp.tan,
        "sqrt": sp.sqrt,
        "exp": sp.exp,
        "pi": sp.pi,
        "E": sp.E,
    }

    try:
        expressao = sp.sympify(texto, locals=permitidas, rational=True)
    except (sp.SympifyError, SyntaxError, TypeError) as erro:
        raise ValueError("Não foi possível interpretar a função.") from erro

    simbolos_extras = expressao.free_symbols - {tempo}

    if simbolos_extras:
        nomes = ", ".join(sorted(str(s) for s in simbolos_extras))
        raise ValueError(
            "A expressão deve depender apenas de t. "
            f"Símbolos não reconhecidos: {nomes}."
        )

    return sp.simplify(expressao)


def ler_intervalo(mensagem="Intervalo físico de validade"):
    print(f"\n{mensagem}")
    t_inicial = ler_float("Tempo inicial (s): ")
    t_final = ler_float("Tempo final (s): ")

    if t_final <= t_inicial:
        raise ValueError("O tempo final deve ser maior que o tempo inicial.")

    return t_inicial, t_final


def _ler_condicoes_integracao(tipo, t0, x_padrao=None, v_padrao=None):
    x0_val = None
    v0_val = None

    if tipo == "v":
        if x_padrao is not None and ler_sim_nao(
            f"Usar continuidade: x({t0:g}) = {sp.sstr(x_padrao)} m?",
            padrao=True,
        ):
            x0_val = x_padrao
        else:
            x0_val = ler_float(f"Posição x({t0:g}) (m): ")

    elif tipo == "a":
        if x_padrao is not None and ler_sim_nao(
            f"Usar continuidade: x({t0:g}) = {sp.sstr(x_padrao)} m?",
            padrao=True,
        ):
            x0_val = x_padrao
        else:
            x0_val = ler_float(f"Posição x({t0:g}) (m): ")

        if v_padrao is not None and ler_sim_nao(
            f"Usar continuidade: v({t0:g}) = {sp.sstr(v_padrao)} m/s?",
            padrao=True,
        ):
            v0_val = v_padrao
        else:
            v0_val = ler_float(f"Velocidade v({t0:g}) (m/s): ")

    return x0_val, v0_val


def definir_movimento_funcao(nome="Partícula"):
    print("\n" + "=" * 60)
    print(f"DEFINIR MOVIMENTO — {nome}")
    print("=" * 60)

    tipo = escolher_opcao(
        "\nQual função o problema fornece?",
        {
            "x": "Posição x(t)",
            "v": "Velocidade v(t)",
            "a": "Aceleração a(t)",
        },
    )

    conhecida = ler_expressao(tipo)
    t_inicial, t_final = ler_intervalo()

    t0 = t_inicial
    x0_val = None
    v0_val = None

    if tipo in ("v", "a"):
        print(
            "\nPara integrar, precisamos das condições iniciais. "
            "Por padrão elas serão dadas no início do domínio."
        )
        t0_lido = ler_float_opcional(
            f"Instante das condições iniciais t0 [ENTER = {t_inicial:g} s]: "
        )
        t0 = t_inicial if t0_lido is None else t0_lido

        if not (t_inicial <= t0 <= t_final):
            raise ValueError("t0 deve estar dentro do domínio físico informado.")

        x0_val, v0_val = _ler_condicoes_integracao(tipo, t0)

    return criar_movimento_um_trecho(
        tipo,
        conhecida,
        t_inicial,
        t_final,
        t0=t0,
        x0=x0_val,
        v0=v0_val,
        nome=nome,
    )


def definir_movimento_piecewise(nome="Partícula"):
    print("\n" + "=" * 60)
    print(f"MOVIMENTO POR TRECHOS — {nome}")
    print("=" * 60)

    quantidade = ler_int("\nNúmero de trechos: ", minimo=2)
    inicio = ler_float("Tempo inicial do primeiro trecho (s): ")

    trechos = []
    x_fronteira = None
    v_fronteira = None

    for indice in range(quantidade):
        print("\n" + "-" * 60)
        print(f"TRECHO {indice + 1} DE {quantidade}")
        print("-" * 60)
        print(f"Início do trecho: t = {inicio:g} s")

        fim = ler_float("Fim do trecho (s): ")

        if fim <= inicio:
            raise ValueError("O fim de cada trecho deve ser maior que o início.")

        tipo = escolher_opcao(
            "\nQual função é conhecida neste trecho?",
            {
                "x": "Posição x(t)",
                "v": "Velocidade v(t)",
                "a": "Aceleração a(t)",
            },
        )

        conhecida = ler_expressao(tipo)
        x0_val = None
        v0_val = None

        if tipo in ("v", "a"):
            x0_val, v0_val = _ler_condicoes_integracao(
                tipo,
                inicio,
                x_padrao=x_fronteira,
                v_padrao=v_fronteira,
            )

        x_expr, v_expr, a_expr = construir_movimento(
            tipo,
            conhecida,
            t0=inicio,
            x0=x0_val,
            v0=v0_val,
        )

        trecho = TrechoMovimento(
            float(inicio),
            float(fim),
            x_expr,
            v_expr,
            a_expr,
        )
        trechos.append(trecho)

        # Valores do lado esquerdo da próxima fronteira. Servem como
        # condições sugeridas para manter continuidade entre trechos.
        tb = numero_exato(fim)
        x_fronteira = sp.simplify(x_expr.subs(tempo, tb))
        v_fronteira = sp.simplify(v_expr.subs(tempo, tb))
        inicio = fim

    movimento = Movimento1D(trechos, nome=nome)
    avisos = movimento.validar_continuidade()

    if avisos:
        print("\nATENÇÃO ÀS FRONTEIRAS DO MODELO:")

        for aviso in avisos:
            if aviso["tipo"] == "posicao":
                print(
                    f"- x(t) é descontínua em t={aviso['tempo']:g} s: "
                    f"{aviso['esquerda']} -> {aviso['direita']}"
                )
            else:
                print(
                    f"- v(t) muda instantaneamente em t={aviso['tempo']:g} s: "
                    f"{aviso['esquerda']} -> {aviso['direita']}"
                )

        print(
            "Uma descontinuidade de posição normalmente indica um modelo "
            "fisicamente inconsistente. Uma descontinuidade de velocidade "
            "pode representar uma idealização impulsiva."
        )

    return movimento


def definir_movimento_interativo(nome="Partícula"):
    escolha = escolher_opcao(
        f"\nComo deseja definir {nome}?",
        {
            "1": "Uma função x(t), v(t) ou a(t)",
            "2": "Movimento por trechos (Piecewise)",
        },
    )

    if escolha == "1":
        return definir_movimento_funcao(nome)

    return definir_movimento_piecewise(nome)


def mostrar_movimento(movimento):
    print("\n" + "=" * 60)
    print("MODELO DE MOVIMENTO")
    print("=" * 60)
    print(f"Domínio: {movimento.t_min:g} <= t <= {movimento.t_max:g} s")
    print(f"x(t) = {sp.sstr(movimento.x)}")
    print(f"v(t) = {sp.sstr(movimento.v)}")
    print(f"a(t) = {sp.sstr(movimento.a)}")


# ============================================================
# MENU DE PERGUNTAS FÍSICAS
# ============================================================


def _intervalo_busca(movimento):
    print(
        f"\nDomínio disponível: [{movimento.t_min:g}, {movimento.t_max:g}] s"
    )
    inicio = ler_float("Tempo inicial da análise (s): ")
    fim = ler_float("Tempo final da análise (s): ")

    if fim <= inicio:
        raise ValueError("O tempo final deve ser maior que o inicial.")

    return inicio, fim


def _imprimir_solucoes_evento(resultado, unidade_t="s"):
    if resultado["pontos"]:
        print("\nInstantes encontrados:")
        for valor in resultado["pontos"]:
            print(f"- t = {valor:.10g} {unidade_t}")

    if resultado["intervalos"]:
        print("\nA condição é satisfeita durante o(s) intervalo(s):")
        for intervalo in resultado["intervalos"]:
            print(f"- {sp.sstr(intervalo)} s")

    if not resultado["pontos"] and not resultado["intervalos"]:
        print("\nNenhuma solução foi encontrada no intervalo.")

    for mensagem in resultado.get("limitacoes", []):
        print(f"\nLIMITAÇÃO DO MÉTODO: {mensagem}")


def _acao_evento(movimento, grandeza, alvo, descricao):
    try:
        inicio, fim = _intervalo_busca(movimento)
        resultado = resolver_evento(
            movimento,
            grandeza,
            alvo,
            inicio,
            fim,
        )
    except ValueError as erro:
        print(f"\nErro: {erro}")
        return

    print(f"\nCondição física: {descricao}")
    _imprimir_solucoes_evento(resultado)


def _acao_extremos(movimento, grandeza):
    try:
        inicio, fim = _intervalo_busca(movimento)
        resultado = extremos(
            movimento,
            grandeza,
            inicio,
            fim,
        )
    except ValueError as erro:
        print(f"\nErro: {erro}")
        return

    unidade = "m" if grandeza == "x" else "m/s"
    nome = "posição" if grandeza == "x" else "velocidade"

    print(f"\nExtremos globais de {nome} no intervalo:")

    if resultado["minimo"]:
        for item in resultado["minimo"]:
            print(
                f"- mínimo: {item['valor']:.10g} {unidade} "
                f"em t={item['t']:.10g} s"
            )

    if resultado["maximo"]:
        for item in resultado["maximo"]:
            print(
                f"- máximo: {item['valor']:.10g} {unidade} "
                f"em t={item['t']:.10g} s"
            )

    for mensagem in resultado["limitacoes"]:
        print(f"\nLIMITAÇÃO DO MÉTODO: {mensagem}")


def _acao_medias(movimento):
    try:
        inicio, fim = _intervalo_busca(movimento)
        resultado = deslocamento_e_velocidade_media(
            movimento,
            inicio,
            fim,
        )
        a_media = aceleracao_media(movimento, inicio, fim)
    except ValueError as erro:
        print(f"\nErro: {erro}")
        return

    print(f"\nx(t1) = {resultado['x_inicial']:.10g} m")
    print(f"x(t2) = {resultado['x_final']:.10g} m")
    print(f"Deslocamento Δx = {resultado['deslocamento']:.10g} m")
    print(
        "Velocidade média = Δx/Δt = "
        f"{resultado['velocidade_media']:.10g} m/s"
    )
    print(
        "Aceleração média = Δv/Δt = "
        f"{a_media:.10g} m/s²"
    )


def _acao_distancia(movimento):
    try:
        inicio, fim = _intervalo_busca(movimento)
        resultado = distancia_e_velocidade_escalar_media(
            movimento,
            inicio,
            fim,
        )
    except ValueError as erro:
        print(f"\nErro: {erro}")
        return

    if resultado["limitacoes"]:
        for mensagem in resultado["limitacoes"]:
            print(f"\nLIMITAÇÃO DO MÉTODO: {mensagem}")
        return

    print(f"\nDistância percorrida = {resultado['distancia']:.10g} m")
    print(
        "Velocidade escalar média = distância/Δt = "
        f"{resultado['velocidade_escalar_media']:.10g} m/s"
    )

    if resultado["pontos_retorno"]:
        print("Pontos de inversão detectados (v=0):")
        for instante in resultado["pontos_retorno"]:
            print(f"- t = {instante:.10g} s")


def _formatar_conjunto(conjunto):
    return sp.sstr(sp.simplify(conjunto))


def _acao_sinais(movimento):
    try:
        inicio, fim = _intervalo_busca(movimento)

        for grandeza, nome in (("v", "velocidade"), ("a", "aceleração")):
            resultado = intervalos_de_sinal(
                movimento,
                grandeza,
                inicio,
                fim,
            )

            print(f"\n{nome.upper()}:")

            if resultado["positivos"]:
                print("  > 0 em:")
                for conjunto in resultado["positivos"]:
                    print(f"    {_formatar_conjunto(conjunto)}")
            else:
                print("  > 0: nenhum intervalo identificado")

            if resultado["negativos"]:
                print("  < 0 em:")
                for conjunto in resultado["negativos"]:
                    print(f"    {_formatar_conjunto(conjunto)}")
            else:
                print("  < 0: nenhum intervalo identificado")

            if resultado["zeros"]:
                print("  = 0 em:")
                for item in resultado["zeros"]:
                    print(f"    {item}")

            for mensagem in resultado["limitacoes"]:
                print(f"  LIMITAÇÃO: {mensagem}")

    except ValueError as erro:
        print(f"\nErro: {erro}")


def _acao_comparar(movimento1):
    print("\nDefina a segunda partícula.")

    try:
        movimento2 = definir_movimento_interativo("Partícula 2")
    except ValueError as erro:
        print(f"\nErro ao construir a segunda partícula: {erro}")
        return

    mostrar_movimento(movimento2)

    evento = escolher_opcao(
        "\nO que deseja comparar?",
        {
            "1": "Quando possuem a mesma posição",
            "2": "Quando possuem a mesma velocidade",
        },
    )

    grandeza = "x" if evento == "1" else "v"

    inicio_padrao = max(movimento1.t_min, movimento2.t_min)
    fim_padrao = min(movimento1.t_max, movimento2.t_max)

    print(
        f"\nDomínio comum disponível: [{inicio_padrao:g}, {fim_padrao:g}] s"
    )
    inicio = ler_float("Tempo inicial da comparação (s): ")
    fim = ler_float("Tempo final da comparação (s): ")

    try:
        resultado = comparar_movimentos(
            movimento1,
            movimento2,
            grandeza,
            inicio,
            fim,
        )
    except ValueError as erro:
        print(f"\nErro: {erro}")
        return

    _imprimir_solucoes_evento(resultado)

    if ler_sim_nao("\nDeseja gerar o gráfico comparativo?", padrao=False):
        gerar_grafico_comparativo(
            movimento1,
            movimento2,
            grandeza,
            resultado["inicio"],
            resultado["fim"],
            eventos=resultado["pontos"],
        )


def menu_perguntas_movimento(movimento):
    while True:
        print("\n" + "=" * 60)
        print("O QUE DESEJA DESCOBRIR?")
        print("=" * 60)

        opcao = escolher_opcao(
            "",
            {
                "1": "Avaliar x, v e a em um instante",
                "2": "Quando a posição assume um valor",
                "3": "Quando a velocidade assume um valor",
                "4": "Quando a aceleração assume um valor",
                "5": "Quando a partícula para",
                "6": "Máximos e mínimos de posição",
                "7": "Máximos e mínimos de velocidade",
                "8": "Deslocamento e velocidade média em um intervalo",
                "9": "Distância e velocidade escalar média",
                "10": "Intervalos de sinal de v e a",
                "11": "Comparar com outra partícula",
                "12": "Gerar gráficos",
                "0": "Voltar",
            },
        )

        if opcao == "0":
            return

        if opcao == "1":
            instante = ler_float("\nInstante t (s): ")

            try:
                estado = avaliar_estado(movimento, instante)
                print(f"\nx = {sp.N(estado['x'], 10)} m")
                print(f"v = {sp.N(estado['v'], 10)} m/s")
                print(f"a = {sp.N(estado['a'], 10)} m/s²")
            except ValueError as erro:
                print(f"\nErro: {erro}")

        elif opcao == "2":
            alvo = ler_float("\nValor de posição procurado x (m): ")
            _acao_evento(movimento, "x", alvo, f"x(t) = {alvo:g} m")

        elif opcao == "3":
            alvo = ler_float("\nValor de velocidade procurado v (m/s): ")
            _acao_evento(movimento, "v", alvo, f"v(t) = {alvo:g} m/s")

        elif opcao == "4":
            alvo = ler_float("\nValor de aceleração procurado a (m/s²): ")
            _acao_evento(movimento, "a", alvo, f"a(t) = {alvo:g} m/s²")

        elif opcao == "5":
            _acao_evento(movimento, "v", 0, "v(t) = 0")

        elif opcao == "6":
            _acao_extremos(movimento, "x")

        elif opcao == "7":
            _acao_extremos(movimento, "v")

        elif opcao == "8":
            _acao_medias(movimento)

        elif opcao == "9":
            _acao_distancia(movimento)

        elif opcao == "10":
            _acao_sinais(movimento)

        elif opcao == "11":
            _acao_comparar(movimento)

        elif opcao == "12":
            try:
                inicio, fim = _intervalo_busca(movimento)
                gerar_graficos_movimento(movimento, inicio, fim)
            except ValueError as erro:
                print(f"\nErro: {erro}")


# ============================================================
# MUV NUMÉRICO
# ============================================================


def resolver_muv():
    print("\n" + "=" * 60)
    print("MOVIMENTO UNIDIMENSIONAL — MUV")
    print("=" * 60)
    print(
        "\nInforme apenas as grandezas que conhece.\n"
        "Se não souber, pressione ENTER.\n"
    )

    perguntas = {
        "x0": "Posição inicial x0 (m): ",
        "x": "Posição final x (m): ",
        "v0": "Velocidade inicial v0 (m/s): ",
        "v": "Velocidade final v (m/s): ",
        "a": "Aceleração a (m/s²): ",
        "t": "Tempo t (s): ",
    }

    conhecidos = {}

    for nome, mensagem in perguntas.items():
        valor = ler_float_opcional(mensagem)
        if valor is not None:
            conhecidos[nome] = valor

    inconsistencias = validar_dados_muv(conhecidos)

    if inconsistencias:
        print("\n" + "=" * 60)
        print("DADOS INCOMPATÍVEIS")
        print("=" * 60)
        print("\nOs valores fornecidos não satisfazem o modelo de MUV.")

        for item in inconsistencias:
            print(
                f"- {item['equacao']} "
                f"(resíduo = {item['residual']:.6g})"
            )

        pausar()
        return

    valores, historico, ambiguidades = resolver_equacoes_iterativamente(
        EQUACOES,
        SIMBOLOS,
        conhecidos,
    )

    unidades = {
        "x0": "m",
        "x": "m",
        "v0": "m/s",
        "v": "m/s",
        "a": "m/s²",
        "t": "s",
    }

    print("\n" + "=" * 60)
    print("RESULTADOS")
    print("=" * 60)

    for nome in ("x0", "x", "v0", "v", "a", "t"):
        if nome in valores:
            origem = "informado" if nome in conhecidos else "calculado"
            print(
                f"{nome:>2} = {valores[nome]:.8g} "
                f"{unidades[nome]} [{origem}]"
            )

    if historico:
        print("\nEQUAÇÕES UTILIZADAS")
        for passo in historico:
            print(f"- {passo['alvo']} usando {passo['equacao']}")

    if ambiguidades:
        print("\nATENÇÃO: existem múltiplas soluções matemáticas possíveis.")
        for nome, info in ambiguidades.items():
            print(f"{nome}: {info['candidatos']}")
        print(
            "O programa não escolhe uma raiz sem um domínio físico informado."
        )

    faltantes = [nome for nome in SIMBOLOS if nome not in valores]

    if faltantes:
        print(
            "\nNão foi possível determinar automaticamente: "
            + ", ".join(faltantes)
        )

    # Se x0, v0 e a são conhecidos, já conseguimos escrever o movimento
    # completo e entregar o mesmo motor de perguntas físicas.
    if all(nome in valores for nome in ("x0", "v0", "a")):
        if ler_sim_nao(
            "\nDeseja analisar este MUV com o motor físico?",
            padrao=False,
        ):
            try:
                t_inicial, t_final = ler_intervalo(
                    "Domínio físico que deseja estudar"
                )
                x_expr = (
                    numero_exato(valores["x0"])
                    + numero_exato(valores["v0"]) * tempo
                    + sp.Rational(1, 2)
                    * numero_exato(valores["a"])
                    * tempo**2
                )
                movimento = criar_movimento_um_trecho(
                    "x",
                    sp.simplify(x_expr),
                    t_inicial,
                    t_final,
                    nome="Partícula",
                )
                mostrar_movimento(movimento)
                menu_perguntas_movimento(movimento)
            except ValueError as erro:
                print(f"\nErro: {erro}")

    pausar()


# ============================================================
# INTERFACES PRINCIPAIS
# ============================================================


def resolver_funcao_conhecida():
    try:
        movimento = definir_movimento_funcao("Partícula")
    except ValueError as erro:
        print(f"\nErro: {erro}")
        pausar()
        return

    mostrar_movimento(movimento)
    menu_perguntas_movimento(movimento)
    pausar()


def resolver_piecewise():
    try:
        movimento = definir_movimento_piecewise("Partícula")
    except ValueError as erro:
        print(f"\nErro: {erro}")
        pausar()
        return

    mostrar_movimento(movimento)
    menu_perguntas_movimento(movimento)
    pausar()


# Compatibilidade com testes e versões anteriores.
def filtrar_solucoes_fisicas(solucoes, t_inicial, t_final):
    validas = []

    for solucao in solucoes:
        solucao_numerica = sp.N(solucao)

        if solucao_numerica.is_real is False:
            continue

        try:
            valor = float(solucao_numerica)
        except (TypeError, ValueError):
            continue

        if t_inicial <= valor <= t_final:
            if not any(abs(valor - existente) < 1e-10 for existente in validas):
                validas.append(valor)

    return sorted(validas)


def resolver_duas_particulas():
    """Atalho de compatibilidade: agora a comparação vive no motor físico."""
    print("\nDefina a Partícula 1.")

    try:
        movimento1 = definir_movimento_interativo("Partícula 1")
    except ValueError as erro:
        print(f"\nErro: {erro}")
        pausar()
        return

    mostrar_movimento(movimento1)
    _acao_comparar(movimento1)
    pausar()


def menu_cinematica():
    while True:
        print("\n" + "=" * 60)
        print("CINEMÁTICA 1D")
        print("=" * 60)

        opcao = escolher_opcao(
            "\nComo o problema fornece os dados?",
            {
                "1": "Valores numéricos — MUV",
                "2": "Uma função x(t), v(t) ou a(t)",
                "3": "Movimento por trechos — Piecewise",
                "0": "Voltar",
            },
        )

        if opcao == "0":
            return

        if opcao == "1":
            resolver_muv()
        elif opcao == "2":
            resolver_funcao_conhecida()
        elif opcao == "3":
            resolver_piecewise()
