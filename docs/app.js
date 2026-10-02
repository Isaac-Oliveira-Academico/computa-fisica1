const botao =
    document.getElementById("calcular");

const resultado =
    document.getElementById("resultado");

const status =
    document.getElementById("status");

const seletorAcao =
    document.getElementById("acao");

const entradaExtraContainer =
    document.getElementById(
        "entrada-extra-container"
    );

const entradaExtraLabel =
    document.getElementById(
        "entrada-extra-label"
    );

const entradaExtra =
    document.getElementById(
        "entrada-extra"
    );

const entradaExtraAjuda =
    document.getElementById(
        "entrada-extra-ajuda"
    );

const intervaloContainer =
    document.getElementById(
        "intervalo-container"
    );

const intervaloT1 =
    document.getElementById(
        "intervalo-t1"
    );

const intervaloT2 =
    document.getElementById(
        "intervalo-t2"
    );


let pyodide = null;


/*
    ============================================================
    INICIALIZAÇÃO
    ============================================================
*/

async function iniciarPython() {

    status.textContent =
        "Carregando Python...";

    pyodide =
        await loadPyodide();

    status.textContent =
        "Carregando SymPy...";

    await pyodide.loadPackage(
        "sympy"
    );

    status.textContent =
        "Motor Python/SymPy pronto.";

    botao.disabled = false;

    botao.textContent =
        "Calcular";
}


/*
    ============================================================
    INTERFACE
    ============================================================
*/

function atualizarCamposExtras() {

    const acao =
        seletorAcao.value;


    entradaExtraContainer.hidden =
        true;

    intervaloContainer.hidden =
        true;


    if (acao === "avaliar") {

        entradaExtraContainer.hidden =
            false;

        entradaExtraLabel.textContent =
            "Instante t₀:";

        entradaExtraAjuda.textContent =
            "Exemplos: 3, 1/2 ou 2.5";

        return;
    }


    if (acao === "posicao") {

        entradaExtraContainer.hidden =
            false;

        entradaExtraLabel.textContent =
            "Posição procurada x (m):";

        entradaExtraAjuda.textContent =
            "Exemplos: 300, -5 ou 1/2";

        return;
    }


    if (acao === "velocidade") {

        entradaExtraContainer.hidden =
            false;

        entradaExtraLabel.textContent =
            "Velocidade procurada v (m/s):";

        entradaExtraAjuda.textContent =
            "Exemplos: 20, -5 ou 10/3";

        return;
    }


    if (acao === "aceleracao") {

        entradaExtraContainer.hidden =
            false;

        entradaExtraLabel.textContent =
            "Aceleração procurada a (m/s²):";

        entradaExtraAjuda.textContent =
            "Exemplos: 12, -9.8 ou 5/2";

        return;
    }


    if (
        acao === "medias_intervalo" ||
        acao === "distancia_escalar"
    ) {

        intervaloContainer.hidden =
            false;
    }
}


/*
    ============================================================
    VALIDAÇÕES
    ============================================================
*/

function funcaoValida(texto) {

    const padrao =
        /^[0-9tT+\-*/().\s]+$/;

    return (
        texto.trim().length > 0 &&
        padrao.test(texto)
    );
}


function valorNumericoValido(texto) {

    const padrao =
        /^[0-9+\-*/().\s]+$/;

    return (
        texto.trim().length > 0 &&
        padrao.test(texto)
    );
}


/*
    ============================================================
    FORMATAÇÃO
    ============================================================
*/

function formatarValor(
    exato,
    numerico,
    unidade
) {

    const valorDireto =
        Number(exato);


    if (
        Number.isFinite(valorDireto) &&
        Math.abs(
            valorDireto - numerico
        ) < 1e-12
    ) {

        return `${exato} ${unidade}`;
    }


    return `
        ${exato} ${unidade}
        (≈ ${numerico.toFixed(9)} ${unidade})
    `;
}


function formatarTempo(
    exato,
    numerico
) {

    const valorDireto =
        Number(exato);


    if (
        Number.isFinite(valorDireto) &&
        Math.abs(
            valorDireto - numerico
        ) < 1e-12
    ) {

        return `t = ${exato} s`;
    }


    return `
        t = ${numerico.toFixed(9)} s
        (${exato})
    `;
}


function listaTempos(
    exatos,
    numericos
) {

    let html =
        "<ul>";


    for (
        let i = 0;
        i < numericos.length;
        i++
    ) {

        html += `
            <li>
                ${formatarTempo(
                    exatos[i],
                    Number(
                        numericos[i]
                    )
                )}
            </li>
        `;
    }


    html +=
        "</ul>";


    return html;
}


/*
    ============================================================
    FUNÇÃO PRINCIPAL
    ============================================================
*/

async function calcularMovimento() {

    const funcao =
        document
            .getElementById("funcao")
            .value
            .trim();

    const tInicial =
        Number(
            document
                .getElementById("t-inicial")
                .value
        );

    const tFinal =
        Number(
            document
                .getElementById("t-final")
                .value
        );

    const acao =
        seletorAcao.value;

    const valorExtraTexto =
        entradaExtra.value.trim();

    const intervaloT1Texto =
        intervaloT1.value.trim();

    const intervaloT2Texto =
        intervaloT2.value.trim();


    if (!funcaoValida(funcao)) {

        resultado.innerHTML = `
            <p>
                Erro: a função contém caracteres
                ou símbolos não permitidos.
            </p>

            <p>
                Use expressões como:
                20*t - 5*t**3
            </p>
        `;

        return;
    }


    if (
        !Number.isFinite(tInicial) ||
        !Number.isFinite(tFinal)
    ) {

        resultado.innerHTML = `
            <p>
                Erro: informe valores numéricos
                válidos para o domínio temporal.
            </p>
        `;

        return;
    }


    if (tInicial >= tFinal) {

        resultado.innerHTML = `
            <p>
                Erro: o tempo final deve ser
                maior que o tempo inicial.
            </p>
        `;

        return;
    }


    const precisaValorExtra =
        acao === "avaliar" ||
        acao === "posicao" ||
        acao === "velocidade" ||
        acao === "aceleracao";


    if (
        precisaValorExtra &&
        !valorNumericoValido(
            valorExtraTexto
        )
    ) {

        resultado.innerHTML = `
            <p>
                Erro: informe um valor válido.
            </p>

            <p>
                Exemplos:
                3, -5, 1/2 ou 2.5
            </p>
        `;

        return;
    }


    const precisaIntervalo =
        acao === "medias_intervalo" ||
        acao === "distancia_escalar";


    if (
        precisaIntervalo &&
        (
            !valorNumericoValido(
                intervaloT1Texto
            )
            ||
            !valorNumericoValido(
                intervaloT2Texto
            )
        )
    ) {

        resultado.innerHTML = `
            <p>
                Erro: informe valores válidos
                para t₁ e t₂.
            </p>

            <p>
                Exemplos:
                0, 3, 1/2 ou 2.5
            </p>
        `;

        return;
    }


    pyodide.globals.set(
        "funcao_js",
        funcao
    );

    pyodide.globals.set(
        "t_inicial_js",
        tInicial
    );

    pyodide.globals.set(
        "t_final_js",
        tFinal
    );

    pyodide.globals.set(
        "acao_js",
        acao
    );

    pyodide.globals.set(
        "valor_extra_js",
        precisaValorExtra
            ? valorExtraTexto
            : ""
    );

    pyodide.globals.set(
        "intervalo_t1_js",
        precisaIntervalo
            ? intervaloT1Texto
            : ""
    );

    pyodide.globals.set(
        "intervalo_t2_js",
        precisaIntervalo
            ? intervaloT2Texto
            : ""
    );


    try {

        const resposta =
            await pyodide.runPythonAsync(`

import sympy as sp


# =============================================================
# 1. MODELO CINEMÁTICO
# =============================================================

t = sp.symbols(
    "t",
    real=True
)


x = sp.sympify(
    funcao_js,
    locals={
        "t": t
    }
)


if not x.free_symbols.issubset({t}):

    raise ValueError(
        "A função só pode depender de t."
    )


v = sp.diff(
    x,
    t
)

a = sp.diff(
    v,
    t
)


# =============================================================
# 2. DOMÍNIO FÍSICO
# =============================================================

t_inicial_exato = sp.Rational(
    str(t_inicial_js)
)

t_final_exato = sp.Rational(
    str(t_final_js)
)


t_inicial = float(
    t_inicial_exato
)

t_final = float(
    t_final_exato
)


dominio = sp.Interval(
    t_inicial_exato,
    t_final_exato
)


acao = str(
    acao_js
)


# =============================================================
# 3. FUNÇÕES AUXILIARES
# =============================================================

def numero_real(expr):

    return float(
        sp.N(expr)
    )


def adicionar_candidato(
    lista,
    candidato
):

    for existente in lista:

        if (
            sp.simplify(
                existente - candidato
            )
            == 0
        ):

            return


    lista.append(
        candidato
    )


def validar_intervalo(
    t1,
    t2
):

    t1_num = numero_real(
        t1
    )

    t2_num = numero_real(
        t2
    )


    if (
        t1_num < t_inicial
        or
        t1_num > t_final
        or
        t2_num < t_inicial
        or
        t2_num > t_final
    ):

        return (
            False,
            (
                "O intervalo informado ultrapassa "
                "o domínio físico do movimento."
            )
        )


    if t2_num <= t1_num:

        return (
            False,
            (
                "O instante t₂ deve ser maior "
                "que o instante t₁."
            )
        )


    return (
        True,
        ""
    )


# =============================================================
# 4. EXTREMOS GLOBAIS
# =============================================================

def calcular_extremos_globais(
    expressao,
    derivada
):

    resultado = {

        "tipo":
            "ok",

        "mensagem":
            "",

        "min_val_exato":
            "",

        "min_val_num":
            None,

        "min_t_exatos":
            [],

        "min_t_nums":
            [],

        "max_val_exato":
            "",

        "max_val_num":
            None,

        "max_t_exatos":
            [],

        "max_t_nums":
            []
    }


    if sp.simplify(
        derivada
    ) == 0:

        valor = sp.simplify(
            expressao.subs(
                t,
                t_inicial_exato
            )
        )


        resultado[
            "tipo"
        ] = "constante"

        resultado[
            "min_val_exato"
        ] = str(
            valor
        )

        resultado[
            "min_val_num"
        ] = numero_real(
            valor
        )

        resultado[
            "max_val_exato"
        ] = str(
            valor
        )

        resultado[
            "max_val_num"
        ] = numero_real(
            valor
        )


        return resultado


    estacionarios = sp.solveset(
        derivada,
        t,
        domain=dominio
    )


    candidatos = []


    adicionar_candidato(
        candidatos,
        t_inicial_exato
    )

    adicionar_candidato(
        candidatos,
        t_final_exato
    )


    if estacionarios == sp.EmptySet:

        pass


    elif isinstance(
        estacionarios,
        sp.FiniteSet
    ):

        for ponto in estacionarios:

            adicionar_candidato(
                candidatos,
                ponto
            )


    elif estacionarios == dominio:

        valor = sp.simplify(
            expressao.subs(
                t,
                t_inicial_exato
            )
        )


        resultado[
            "tipo"
        ] = "constante"

        resultado[
            "min_val_exato"
        ] = str(
            valor
        )

        resultado[
            "min_val_num"
        ] = numero_real(
            valor
        )

        resultado[
            "max_val_exato"
        ] = str(
            valor
        )

        resultado[
            "max_val_num"
        ] = numero_real(
            valor
        )


        return resultado


    else:

        resultado[
            "tipo"
        ] = "limitacao"

        resultado[
            "mensagem"
        ] = (
            "Não foi possível reduzir simbolicamente "
            "os pontos críticos a um conjunto finito "
            "de instantes."
        )


        return resultado


    candidatos = sorted(
        candidatos,
        key=numero_real
    )


    valores = []


    for ponto in candidatos:

        valor_exato = sp.simplify(
            expressao.subs(
                t,
                ponto
            )
        )


        valor_num = numero_real(
            valor_exato
        )


        valores.append({

            "t_exato":
                ponto,

            "t_num":
                numero_real(
                    ponto
                ),

            "valor_exato":
                valor_exato,

            "valor_num":
                valor_num
        })


    min_num = min(
        item[
            "valor_num"
        ]
        for item
        in valores
    )

    max_num = max(
        item[
            "valor_num"
        ]
        for item
        in valores
    )


    tolerancia_min = (
        1e-10
        *
        max(
            1.0,
            abs(
                min_num
            )
        )
    )

    tolerancia_max = (
        1e-10
        *
        max(
            1.0,
            abs(
                max_num
            )
        )
    )


    min_itens = [

        item

        for item
        in valores

        if abs(
            item["valor_num"]
            -
            min_num
        )
        <=
        tolerancia_min
    ]


    max_itens = [

        item

        for item
        in valores

        if abs(
            item["valor_num"]
            -
            max_num
        )
        <=
        tolerancia_max
    ]


    resultado[
        "min_val_exato"
    ] = str(
        min_itens[0][
            "valor_exato"
        ]
    )

    resultado[
        "min_val_num"
    ] = min_num

    resultado[
        "min_t_exatos"
    ] = [

        str(
            item[
                "t_exato"
            ]
        )

        for item
        in min_itens
    ]

    resultado[
        "min_t_nums"
    ] = [

        item[
            "t_num"
        ]

        for item
        in min_itens
    ]


    resultado[
        "max_val_exato"
    ] = str(
        max_itens[0][
            "valor_exato"
        ]
    )

    resultado[
        "max_val_num"
    ] = max_num

    resultado[
        "max_t_exatos"
    ] = [

        str(
            item[
                "t_exato"
            ]
        )

        for item
        in max_itens
    ]

    resultado[
        "max_t_nums"
    ] = [

        item[
            "t_num"
        ]

        for item
        in max_itens
    ]


    return resultado


# =============================================================
# 5. DISTÂNCIA TOTAL
# =============================================================

def calcular_distancia_total(
    t1,
    t2
):

    intervalo = sp.Interval(
        t1,
        t2
    )


    zeros_v = sp.solveset(
        v,
        t,
        domain=intervalo
    )


    # ---------------------------------------------------------
    # REPOUSO DURANTE TODO O INTERVALO
    # ---------------------------------------------------------

    if (
        sp.simplify(
            v
        ) == 0
        or
        zeros_v == intervalo
    ):

        return {

            "tipo":
                "ok",

            "mensagem":
                "",

            "pontos_exatos":
                [
                    str(
                        sp.simplify(
                            t1
                        )
                    ),
                    str(
                        sp.simplify(
                            t2
                        )
                    )
                ],

            "pontos_numericos":
                [
                    numero_real(
                        t1
                    ),
                    numero_real(
                        t2
                    )
                ],

            "distancia_exata":
                "0",

            "distancia_numerica":
                0.0
        }


    pontos = []


    adicionar_candidato(
        pontos,
        t1
    )

    adicionar_candidato(
        pontos,
        t2
    )


    # ---------------------------------------------------------
    # SEM PONTOS DE VELOCIDADE ZERO
    # ---------------------------------------------------------

    if zeros_v == sp.EmptySet:

        pass


    # ---------------------------------------------------------
    # CONJUNTO FINITO DE PONTOS DE VELOCIDADE ZERO
    # ---------------------------------------------------------

    elif isinstance(
        zeros_v,
        sp.FiniteSet
    ):

        for raiz in zeros_v:

            raiz_num = numero_real(
                raiz
            )


            if (
                numero_real(
                    t1
                )
                <
                raiz_num
                <
                numero_real(
                    t2
                )
            ):

                adicionar_candidato(
                    pontos,
                    raiz
                )


    # ---------------------------------------------------------
    # LIMITAÇÃO SIMBÓLICA
    # ---------------------------------------------------------

    else:

        return {

            "tipo":
                "limitacao",

            "mensagem":
                (
                    "Não foi possível reduzir simbolicamente "
                    "os instantes de mudança de sentido a "
                    "um conjunto finito de pontos."
                ),

            "pontos_exatos":
                [],

            "pontos_numericos":
                [],

            "distancia_exata":
                "",

            "distancia_numerica":
                None
        }


    pontos = sorted(
        pontos,
        key=numero_real
    )


    distancia = sp.Integer(
        0
    )


    for i in range(
        len(
            pontos
        )
        -
        1
    ):

        xa = sp.simplify(
            x.subs(
                t,
                pontos[i]
            )
        )

        xb = sp.simplify(
            x.subs(
                t,
                pontos[
                    i + 1
                ]
            )
        )


        distancia += sp.Abs(
            sp.simplify(
                xb - xa
            )
        )


    distancia = sp.simplify(
        distancia
    )


    return {

        "tipo":
            "ok",

        "mensagem":
            "",

        "pontos_exatos":
            [
                str(
                    sp.simplify(
                        ponto
                    )
                )
                for ponto
                in pontos
            ],

        "pontos_numericos":
            [
                numero_real(
                    ponto
                )
                for ponto
                in pontos
            ],

        "distancia_exata":
            str(
                distancia
            ),

        "distancia_numerica":
            numero_real(
                distancia
            )
    }


# =============================================================
# 6. OBJETO PADRÃO DE SAÍDA
# =============================================================

resultado_dados = {

    "x":
        str(
            sp.factor(
                x
            )
        ),

    "v":
        str(
            sp.factor(
                v
            )
        ),

    "a":
        str(
            sp.factor(
                a
            )
        ),

    "t_inicial":
        t_inicial,

    "t_final":
        t_final,

    "acao":
        acao,

    "tipo_operacao":
        "",


    "grandeza_nome":
        "",

    "unidade":
        "",

    "alvo":
        "",

    "tipo_evento":
        "nao_aplicavel",

    "solucoes_exatas":
        [],

    "solucoes_numericas":
        [],


    "instante_exato":
        "",

    "avaliacao_valida":
        False,

    "avaliacao_mensagem":
        "",

    "x_avaliado_exato":
        "",

    "v_avaliado_exato":
        "",

    "a_avaliado_exato":
        "",

    "x_avaliado_numerico":
        None,

    "v_avaliado_numerico":
        None,

    "a_avaliado_numerico":
        None,


    "extremos_tipo":
        "nao_aplicavel",

    "extremos_mensagem":
        "",

    "extremos_grandeza_nome":
        "",

    "extremos_unidade":
        "",

    "minimo_valor_exato":
        "",

    "minimo_valor_numerico":
        None,

    "minimo_tempos_exatos":
        [],

    "minimo_tempos_numericos":
        [],

    "maximo_valor_exato":
        "",

    "maximo_valor_numerico":
        None,

    "maximo_tempos_exatos":
        [],

    "maximo_tempos_numericos":
        [],


    "intervalo_valido":
        False,

    "intervalo_mensagem":
        "",

    "intervalo_t1_exato":
        "",

    "intervalo_t2_exato":
        "",

    "delta_t_exato":
        "",

    "delta_t_numerico":
        None,

    "x_t1_exato":
        "",

    "x_t2_exato":
        "",

    "x_t1_numerico":
        None,

    "x_t2_numerico":
        None,

    "v_t1_exato":
        "",

    "v_t2_exato":
        "",

    "v_t1_numerico":
        None,

    "v_t2_numerico":
        None,

    "deslocamento_exato":
        "",

    "deslocamento_numerico":
        None,

    "velocidade_media_exato":
        "",

    "velocidade_media_numerico":
        None,

    "aceleracao_media_exato":
        "",

    "aceleracao_media_numerico":
        None,


    "distancia_tipo":
        "nao_aplicavel",

    "distancia_mensagem":
        "",

    "pontos_inversao_exatos":
        [],

    "pontos_inversao_numericos":
        [],

    "distancia_total_exato":
        "",

    "distancia_total_numerico":
        None,

    "velocidade_escalar_media_exato":
        "",

    "velocidade_escalar_media_numerico":
        None
}


# =============================================================
# 7. MOSTRAR MODELO
# =============================================================

if acao == "modelo":

    resultado_dados[
        "tipo_operacao"
    ] = "modelo"


# =============================================================
# 8. AVALIAR ESTADO
# =============================================================

elif acao == "avaliar":

    resultado_dados[
        "tipo_operacao"
    ] = "avaliacao"


    instante = sp.sympify(
        valor_extra_js
    )


    if instante.free_symbols:

        raise ValueError(
            "O instante não pode conter variáveis."
        )


    instante_num = numero_real(
        instante
    )


    resultado_dados[
        "instante_exato"
    ] = str(
        sp.simplify(
            instante
        )
    )


    if (
        instante_num
        <
        t_inicial
        or
        instante_num
        >
        t_final
    ):

        resultado_dados[
            "avaliacao_valida"
        ] = False

        resultado_dados[
            "avaliacao_mensagem"
        ] = (
            "O instante informado está "
            "fora do domínio físico."
        )


    else:

        resultado_dados[
            "avaliacao_valida"
        ] = True


        x0 = sp.simplify(
            x.subs(
                t,
                instante
            )
        )

        v0 = sp.simplify(
            v.subs(
                t,
                instante
            )
        )

        a0 = sp.simplify(
            a.subs(
                t,
                instante
            )
        )


        resultado_dados[
            "x_avaliado_exato"
        ] = str(
            x0
        )

        resultado_dados[
            "v_avaliado_exato"
        ] = str(
            v0
        )

        resultado_dados[
            "a_avaliado_exato"
        ] = str(
            a0
        )


        resultado_dados[
            "x_avaliado_numerico"
        ] = numero_real(
            x0
        )

        resultado_dados[
            "v_avaliado_numerico"
        ] = numero_real(
            v0
        )

        resultado_dados[
            "a_avaliado_numerico"
        ] = numero_real(
            a0
        )


# =============================================================
# 9. EVENTOS
# =============================================================

elif acao in (
    "posicao",
    "velocidade",
    "aceleracao",
    "parar"
):

    resultado_dados[
        "tipo_operacao"
    ] = "evento"


    if acao == "posicao":

        expressao_evento = x

        alvo = sp.sympify(
            valor_extra_js
        )

        nome = "x(t)"

        unidade = "m"


    elif acao == "velocidade":

        expressao_evento = v

        alvo = sp.sympify(
            valor_extra_js
        )

        nome = "v(t)"

        unidade = "m/s"


    elif acao == "aceleracao":

        expressao_evento = a

        alvo = sp.sympify(
            valor_extra_js
        )

        nome = "a(t)"

        unidade = "m/s²"


    else:

        expressao_evento = v

        alvo = sp.Integer(
            0
        )

        nome = "v(t)"

        unidade = "m/s"


    if alvo.free_symbols:

        raise ValueError(
            "O valor-alvo não pode conter variáveis."
        )


    solucoes = sp.solveset(
        expressao_evento
        -
        alvo,
        t,
        domain=dominio
    )


    resultado_dados[
        "grandeza_nome"
    ] = nome

    resultado_dados[
        "unidade"
    ] = unidade

    resultado_dados[
        "alvo"
    ] = str(
        sp.simplify(
            alvo
        )
    )


    if solucoes == sp.EmptySet:

        resultado_dados[
            "tipo_evento"
        ] = "nenhuma"


    elif solucoes == dominio:

        resultado_dados[
            "tipo_evento"
        ] = "todo_dominio"


    elif isinstance(
        solucoes,
        sp.FiniteSet
    ):

        ordenadas = sorted(
            list(
                solucoes
            ),
            key=numero_real
        )


        resultado_dados[
            "tipo_evento"
        ] = "pontos"

        resultado_dados[
            "solucoes_exatas"
        ] = [

            str(
                sp.simplify(
                    solucao
                )
            )

            for solucao
            in ordenadas
        ]

        resultado_dados[
            "solucoes_numericas"
        ] = [

            numero_real(
                solucao
            )

            for solucao
            in ordenadas
        ]


    else:

        resultado_dados[
            "tipo_evento"
        ] = "nao_reduzido"

        resultado_dados[
            "solucoes_exatas"
        ] = [
            str(
                solucoes
            )
        ]


# =============================================================
# 10. EXTREMOS
# =============================================================

elif acao in (
    "extremos_posicao",
    "extremos_velocidade"
):

    resultado_dados[
        "tipo_operacao"
    ] = "extremos"


    if acao == "extremos_posicao":

        dados_extremos = (
            calcular_extremos_globais(
                x,
                v
            )
        )

        nome = (
            "posição x(t)"
        )

        unidade = "m"


    else:

        dados_extremos = (
            calcular_extremos_globais(
                v,
                a
            )
        )

        nome = (
            "velocidade v(t)"
        )

        unidade = "m/s"


    resultado_dados[
        "extremos_tipo"
    ] = dados_extremos[
        "tipo"
    ]

    resultado_dados[
        "extremos_mensagem"
    ] = dados_extremos[
        "mensagem"
    ]

    resultado_dados[
        "extremos_grandeza_nome"
    ] = nome

    resultado_dados[
        "extremos_unidade"
    ] = unidade


    resultado_dados[
        "minimo_valor_exato"
    ] = dados_extremos[
        "min_val_exato"
    ]

    resultado_dados[
        "minimo_valor_numerico"
    ] = dados_extremos[
        "min_val_num"
    ]

    resultado_dados[
        "minimo_tempos_exatos"
    ] = dados_extremos[
        "min_t_exatos"
    ]

    resultado_dados[
        "minimo_tempos_numericos"
    ] = dados_extremos[
        "min_t_nums"
    ]


    resultado_dados[
        "maximo_valor_exato"
    ] = dados_extremos[
        "max_val_exato"
    ]

    resultado_dados[
        "maximo_valor_numerico"
    ] = dados_extremos[
        "max_val_num"
    ]

    resultado_dados[
        "maximo_tempos_exatos"
    ] = dados_extremos[
        "max_t_exatos"
    ]

    resultado_dados[
        "maximo_tempos_numericos"
    ] = dados_extremos[
        "max_t_nums"
    ]


# =============================================================
# 11. OPERAÇÕES EM INTERVALO
# =============================================================

elif acao in (
    "medias_intervalo",
    "distancia_escalar"
):

    resultado_dados[
        "tipo_operacao"
    ] = acao


    t1 = sp.sympify(
        intervalo_t1_js
    )

    t2 = sp.sympify(
        intervalo_t2_js
    )


    if (
        t1.free_symbols
        or
        t2.free_symbols
    ):

        raise ValueError(
            "Os instantes do intervalo "
            "não podem conter variáveis."
        )


    valido, mensagem = (
        validar_intervalo(
            t1,
            t2
        )
    )


    resultado_dados[
        "intervalo_valido"
    ] = valido

    resultado_dados[
        "intervalo_mensagem"
    ] = mensagem

    resultado_dados[
        "intervalo_t1_exato"
    ] = str(
        sp.simplify(
            t1
        )
    )

    resultado_dados[
        "intervalo_t2_exato"
    ] = str(
        sp.simplify(
            t2
        )
    )


    if valido:

        delta_t = sp.simplify(
            t2 - t1
        )


        x1 = sp.simplify(
            x.subs(
                t,
                t1
            )
        )

        x2 = sp.simplify(
            x.subs(
                t,
                t2
            )
        )


        v1 = sp.simplify(
            v.subs(
                t,
                t1
            )
        )

        v2 = sp.simplify(
            v.subs(
                t,
                t2
            )
        )


        deslocamento = sp.simplify(
            x2 - x1
        )


        velocidade_media = sp.simplify(
            deslocamento
            /
            delta_t
        )


        aceleracao_media = sp.simplify(
            (
                v2 - v1
            )
            /
            delta_t
        )


        resultado_dados[
            "delta_t_exato"
        ] = str(
            delta_t
        )

        resultado_dados[
            "delta_t_numerico"
        ] = numero_real(
            delta_t
        )


        resultado_dados[
            "x_t1_exato"
        ] = str(
            x1
        )

        resultado_dados[
            "x_t2_exato"
        ] = str(
            x2
        )

        resultado_dados[
            "x_t1_numerico"
        ] = numero_real(
            x1
        )

        resultado_dados[
            "x_t2_numerico"
        ] = numero_real(
            x2
        )


        resultado_dados[
            "v_t1_exato"
        ] = str(
            v1
        )

        resultado_dados[
            "v_t2_exato"
        ] = str(
            v2
        )

        resultado_dados[
            "v_t1_numerico"
        ] = numero_real(
            v1
        )

        resultado_dados[
            "v_t2_numerico"
        ] = numero_real(
            v2
        )


        resultado_dados[
            "deslocamento_exato"
        ] = str(
            deslocamento
        )

        resultado_dados[
            "deslocamento_numerico"
        ] = numero_real(
            deslocamento
        )


        resultado_dados[
            "velocidade_media_exato"
        ] = str(
            velocidade_media
        )

        resultado_dados[
            "velocidade_media_numerico"
        ] = numero_real(
            velocidade_media
        )


        resultado_dados[
            "aceleracao_media_exato"
        ] = str(
            aceleracao_media
        )

        resultado_dados[
            "aceleracao_media_numerico"
        ] = numero_real(
            aceleracao_media
        )


        # -----------------------------------------------------
        # DISTÂNCIA TOTAL E VELOCIDADE ESCALAR MÉDIA
        # -----------------------------------------------------

        if acao == "distancia_escalar":

            dados_distancia = (
                calcular_distancia_total(
                    t1,
                    t2
                )
            )


            resultado_dados[
                "distancia_tipo"
            ] = dados_distancia[
                "tipo"
            ]

            resultado_dados[
                "distancia_mensagem"
            ] = dados_distancia[
                "mensagem"
            ]

            resultado_dados[
                "pontos_inversao_exatos"
            ] = dados_distancia[
                "pontos_exatos"
            ]

            resultado_dados[
                "pontos_inversao_numericos"
            ] = dados_distancia[
                "pontos_numericos"
            ]


            if (
                dados_distancia[
                    "tipo"
                ]
                ==
                "ok"
            ):

                distancia = sp.sympify(
                    dados_distancia[
                        "distancia_exata"
                    ]
                )


                velocidade_escalar_media = (
                    sp.simplify(
                        distancia
                        /
                        delta_t
                    )
                )


                resultado_dados[
                    "distancia_total_exato"
                ] = str(
                    distancia
                )

                resultado_dados[
                    "distancia_total_numerico"
                ] = numero_real(
                    distancia
                )


                resultado_dados[
                    "velocidade_escalar_media_exato"
                ] = str(
                    velocidade_escalar_media
                )

                resultado_dados[
                    "velocidade_escalar_media_numerico"
                ] = numero_real(
                    velocidade_escalar_media
                )


else:

    raise ValueError(
        "Ação desconhecida."
    )


resultado_dados
            `);


        const dados =
            resposta.toJs({
                dict_converter:
                    Object.fromEntries
            });


        let html = `
            <p>
                <strong>Domínio:</strong>
                ${dados.t_inicial}
                ≤ t ≤
                ${dados.t_final}
            </p>

            <p>
                <strong>x(t):</strong>
                ${dados.x}
            </p>

            <p>
                <strong>v(t):</strong>
                ${dados.v}
            </p>

            <p>
                <strong>a(t):</strong>
                ${dados.a}
            </p>
        `;


        /*
            ====================================================
            AVALIAÇÃO
            ====================================================
        */

        if (
            dados.tipo_operacao ===
            "avaliacao"
        ) {

            html += `
                <hr>

                <p>
                    <strong>
                        Instante avaliado:
                    </strong>

                    t =
                    ${dados.instante_exato}
                    s
                </p>
            `;


            if (
                !dados.avaliacao_valida
            ) {

                html += `
                    <p>
                        ${dados.avaliacao_mensagem}
                    </p>
                `;
            }


            else {

                html += `
                    <p>
                        <strong>
                            Estado da partícula:
                        </strong>
                    </p>

                    <p>
                        x(${dados.instante_exato})
                        =
                        ${formatarValor(
                            dados.x_avaliado_exato,
                            Number(
                                dados.x_avaliado_numerico
                            ),
                            "m"
                        )}
                    </p>

                    <p>
                        v(${dados.instante_exato})
                        =
                        ${formatarValor(
                            dados.v_avaliado_exato,
                            Number(
                                dados.v_avaliado_numerico
                            ),
                            "m/s"
                        )}
                    </p>

                    <p>
                        a(${dados.instante_exato})
                        =
                        ${formatarValor(
                            dados.a_avaliado_exato,
                            Number(
                                dados.a_avaliado_numerico
                            ),
                            "m/s²"
                        )}
                    </p>
                `;
            }
        }


        /*
            ====================================================
            EVENTOS
            ====================================================
        */

        if (
            dados.tipo_operacao ===
            "evento"
        ) {

            html += `
                <hr>

                <p>
                    <strong>
                        Condição física:
                    </strong>

                    ${dados.grandeza_nome}
                    =
                    ${dados.alvo}
                    ${dados.unidade}
                </p>
            `;


            if (
                dados.tipo_evento ===
                "nenhuma"
            ) {

                html += `
                    <p>
                        Não foram encontrados
                        instantes que satisfaçam
                        essa condição dentro do
                        domínio informado.
                    </p>
                `;
            }


            else if (
                dados.tipo_evento ===
                "todo_dominio"
            ) {

                html += `
                    <p>
                        A condição é satisfeita
                        em todo o domínio informado.
                    </p>
                `;


                if (
                    dados.acao ===
                    "parar"
                ) {

                    html += `
                        <p>
                            A partícula permanece
                            em repouso durante todo
                            o intervalo analisado.
                        </p>
                    `;
                }
            }


            else if (
                dados.tipo_evento ===
                "pontos"
            ) {

                html += `
                    <p>
                        <strong>
                            Instantes encontrados:
                        </strong>
                    </p>

                    ${listaTempos(
                        dados.solucoes_exatas,
                        dados.solucoes_numericas
                    )}
                `;
            }


            else {

                html += `
                    <p>
                        O SymPy encontrou uma solução,
                        mas ela não pôde ser reduzida
                        automaticamente a instantes
                        isolados.
                    </p>

                    <p>
                        <strong>
                            Solução simbólica:
                        </strong>

                        ${dados.solucoes_exatas[0]}
                    </p>
                `;
            }
        }


        /*
            ====================================================
            EXTREMOS
            ====================================================
        */

        if (
            dados.tipo_operacao ===
            "extremos"
        ) {

            html += `
                <hr>

                <p>
                    <strong>Análise:</strong>

                    extremos globais de
                    ${dados.extremos_grandeza_nome}
                    no domínio informado.
                </p>
            `;


            if (
                dados.extremos_tipo ===
                "limitacao"
            ) {

                html += `
                    <p>
                        ${dados.extremos_mensagem}
                    </p>
                `;
            }


            else if (
                dados.extremos_tipo ===
                "constante"
            ) {

                html += `
                    <p>
                        A grandeza é constante
                        em todo o domínio.
                    </p>

                    <p>
                        <strong>
                            Mínimo global:
                        </strong>

                        ${formatarValor(
                            dados.minimo_valor_exato,
                            Number(
                                dados.minimo_valor_numerico
                            ),
                            dados.extremos_unidade
                        )}
                    </p>

                    <p>
                        <strong>
                            Máximo global:
                        </strong>

                        ${formatarValor(
                            dados.maximo_valor_exato,
                            Number(
                                dados.maximo_valor_numerico
                            ),
                            dados.extremos_unidade
                        )}
                    </p>

                    <p>
                        Ambos ocorrem em todo
                        o intervalo analisado.
                    </p>
                `;
            }


            else {

                html += `
                    <p>
                        <strong>
                            Mínimo global:
                        </strong>

                        ${formatarValor(
                            dados.minimo_valor_exato,
                            Number(
                                dados.minimo_valor_numerico
                            ),
                            dados.extremos_unidade
                        )}
                    </p>

                    <p>
                        <strong>
                            Ocorre em:
                        </strong>
                    </p>

                    ${listaTempos(
                        dados.minimo_tempos_exatos,
                        dados.minimo_tempos_numericos
                    )}

                    <p>
                        <strong>
                            Máximo global:
                        </strong>

                        ${formatarValor(
                            dados.maximo_valor_exato,
                            Number(
                                dados.maximo_valor_numerico
                            ),
                            dados.extremos_unidade
                        )}
                    </p>

                    <p>
                        <strong>
                            Ocorre em:
                        </strong>
                    </p>

                    ${listaTempos(
                        dados.maximo_tempos_exatos,
                        dados.maximo_tempos_numericos
                    )}
                `;
            }
        }


        /*
            ====================================================
            OPERAÇÕES EM INTERVALO
            ====================================================
        */

        if (
            dados.tipo_operacao ===
            "medias_intervalo"
            ||
            dados.tipo_operacao ===
            "distancia_escalar"
        ) {

            html += `
                <hr>
            `;


            if (
                !dados.intervalo_valido
            ) {

                html += `
                    <p>
                        <strong>
                            Intervalo informado:
                        </strong>

                        ${dados.intervalo_t1_exato}
                        →
                        ${dados.intervalo_t2_exato}
                        s
                    </p>

                    <p>
                        ${dados.intervalo_mensagem}
                    </p>
                `;
            }


            else {

                html += `
                    <p>
                        <strong>
                            Intervalo analisado:
                        </strong>

                        ${dados.intervalo_t1_exato}
                        ≤ t ≤
                        ${dados.intervalo_t2_exato}
                        s
                    </p>

                    <p>
                        <strong>
                            Estado nas extremidades:
                        </strong>
                    </p>

                    <p>
                        x(${dados.intervalo_t1_exato})
                        =
                        ${formatarValor(
                            dados.x_t1_exato,
                            Number(
                                dados.x_t1_numerico
                            ),
                            "m"
                        )}
                    </p>

                    <p>
                        x(${dados.intervalo_t2_exato})
                        =
                        ${formatarValor(
                            dados.x_t2_exato,
                            Number(
                                dados.x_t2_numerico
                            ),
                            "m"
                        )}
                    </p>

                    <p>
                        v(${dados.intervalo_t1_exato})
                        =
                        ${formatarValor(
                            dados.v_t1_exato,
                            Number(
                                dados.v_t1_numerico
                            ),
                            "m/s"
                        )}
                    </p>

                    <p>
                        v(${dados.intervalo_t2_exato})
                        =
                        ${formatarValor(
                            dados.v_t2_exato,
                            Number(
                                dados.v_t2_numerico
                            ),
                            "m/s"
                        )}
                    </p>

                    <p>
                        <strong>Δt:</strong>

                        ${formatarValor(
                            dados.delta_t_exato,
                            Number(
                                dados.delta_t_numerico
                            ),
                            "s"
                        )}
                    </p>

                    <p>
                        <strong>
                            Deslocamento Δx:
                        </strong>

                        ${formatarValor(
                            dados.deslocamento_exato,
                            Number(
                                dados.deslocamento_numerico
                            ),
                            "m"
                        )}
                    </p>

                    <p>
                        <strong>
                            Velocidade média:
                        </strong>

                        ${formatarValor(
                            dados.velocidade_media_exato,
                            Number(
                                dados.velocidade_media_numerico
                            ),
                            "m/s"
                        )}
                    </p>
                `;


                if (
                    dados.tipo_operacao ===
                    "medias_intervalo"
                ) {

                    html += `
                        <p>
                            <strong>
                                Aceleração média:
                            </strong>

                            ${formatarValor(
                                dados.aceleracao_media_exato,
                                Number(
                                    dados.aceleracao_media_numerico
                                ),
                                "m/s²"
                            )}
                        </p>
                    `;
                }


                if (
                    dados.tipo_operacao ===
                    "distancia_escalar"
                ) {

                    if (
                        dados.distancia_tipo ===
                        "limitacao"
                    ) {

                        html += `
                            <p>
                                ${dados.distancia_mensagem}
                            </p>
                        `;
                    }


                    else {

                        html += `
                            <p>
                                <strong>
                                    Pontos usados para dividir o percurso:
                                </strong>
                            </p>

                            ${listaTempos(
                                dados.pontos_inversao_exatos,
                                dados.pontos_inversao_numericos
                            )}

                            <p>
                                <strong>
                                    Distância total:
                                </strong>

                                ${formatarValor(
                                    dados.distancia_total_exato,
                                    Number(
                                        dados.distancia_total_numerico
                                    ),
                                    "m"
                                )}
                            </p>

                            <p>
                                <strong>
                                    Velocidade escalar média:
                                </strong>

                                ${formatarValor(
                                    dados.velocidade_escalar_media_exato,
                                    Number(
                                        dados.velocidade_escalar_media_numerico
                                    ),
                                    "m/s"
                                )}
                            </p>
                        `;
                    }
                }
            }
        }


        resultado.innerHTML =
            html;


        resposta.destroy();

    }

    catch (erro) {

        console.error(
            erro
        );

        resultado.innerHTML = `
            <p>
                Não foi possível interpretar
                ou resolver os dados fornecidos.
            </p>

            <p>
                Verifique a função,
                o domínio e os valores informados.
            </p>
        `;
    }
}


seletorAcao.addEventListener(
    "change",
    atualizarCamposExtras
);


botao.addEventListener(
    "click",
    calcularMovimento
);


atualizarCamposExtras();


iniciarPython();