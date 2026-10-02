const botao = document.getElementById("calcular");
const resultado = document.getElementById("resultado");
const status = document.getElementById("status");

const seletorAcao = document.getElementById("acao");
const entradaExtraContainer =
    document.getElementById("entrada-extra-container");
const entradaExtraLabel =
    document.getElementById("entrada-extra-label");
const entradaExtra =
    document.getElementById("entrada-extra");
const entradaExtraAjuda =
    document.getElementById("entrada-extra-ajuda");

let pyodide = null;


async function iniciarPython() {

    status.textContent = "Carregando Python...";

    pyodide = await loadPyodide();

    status.textContent = "Carregando SymPy...";

    await pyodide.loadPackage("sympy");

    status.textContent = "Motor Python/SymPy pronto.";

    botao.disabled = false;
    botao.textContent = "Calcular";
}


function atualizarCampoExtra() {

    const acao = seletorAcao.value;


    if (acao === "avaliar") {

        entradaExtraContainer.hidden = false;

        entradaExtraLabel.textContent =
            "Instante t₀:";

        entradaExtraAjuda.textContent =
            "Exemplos: 3, 1/2 ou 2.5";

        return;
    }


    if (acao === "posicao") {

        entradaExtraContainer.hidden = false;

        entradaExtraLabel.textContent =
            "Posição procurada x (m):";

        entradaExtraAjuda.textContent =
            "Exemplos: 300, -5 ou 1/2";

        return;
    }


    if (acao === "velocidade") {

        entradaExtraContainer.hidden = false;

        entradaExtraLabel.textContent =
            "Velocidade procurada v (m/s):";

        entradaExtraAjuda.textContent =
            "Exemplos: 20, -5 ou 10/3";

        return;
    }


    if (acao === "aceleracao") {

        entradaExtraContainer.hidden = false;

        entradaExtraLabel.textContent =
            "Aceleração procurada a (m/s²):";

        entradaExtraAjuda.textContent =
            "Exemplos: 12, -9.8 ou 5/2";

        return;
    }


    /*
        modelo
        parar
        extremos_posicao
        extremos_velocidade
    */
    entradaExtraContainer.hidden = true;
}


function funcaoValida(texto) {

    const padrao =
        /^[0-9tT+\-*/().\s]+$/;

    return (
        texto.trim().length > 0 &&
        padrao.test(texto)
    );
}


function valorExtraValido(texto) {

    const padrao =
        /^[0-9+\-*/().\s]+$/;

    return (
        texto.trim().length > 0 &&
        padrao.test(texto)
    );
}


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

    let html = "<ul>";


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


    html += "</ul>";

    return html;
}


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


    /*
        --------------------------------------------------------
        VALIDAÇÃO DA FUNÇÃO
        --------------------------------------------------------
    */
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


    /*
        --------------------------------------------------------
        VALIDAÇÃO DO DOMÍNIO
        --------------------------------------------------------
    */
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
        !valorExtraValido(
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


    /*
        --------------------------------------------------------
        ENVIO DOS DADOS AO PYTHON
        --------------------------------------------------------
    */
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


    try {

        const resposta =
            await pyodide.runPythonAsync(`

import sympy as sp


# =============================================================
# 1. VARIÁVEL SIMBÓLICA
# =============================================================

t = sp.symbols(
    "t",
    real=True
)


# =============================================================
# 2. FUNÇÃO POSIÇÃO
# =============================================================

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


# =============================================================
# 3. VELOCIDADE E ACELERAÇÃO
# =============================================================

v = sp.diff(
    x,
    t
)

a = sp.diff(
    v,
    t
)


# =============================================================
# 4. DOMÍNIO FÍSICO
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


# =============================================================
# 5. AÇÃO ESCOLHIDA
# =============================================================

acao = str(
    acao_js
)


# =============================================================
# 6. VARIÁVEIS GERAIS DE RESULTADO
# =============================================================

tipo_operacao = ""

grandeza_nome = ""

unidade = ""

alvo = None


# =============================================================
# 7. RESULTADOS DOS EVENTOS
# =============================================================

tipo_evento = "nao_aplicavel"

solucoes_exatas = []

solucoes_numericas = []


# =============================================================
# 8. RESULTADOS DA AVALIAÇÃO EM t0
# =============================================================

instante_exato = ""

instante_numerico = None

avaliacao_valida = False

avaliacao_mensagem = ""

x_avaliado_exato = ""

v_avaliado_exato = ""

a_avaliado_exato = ""

x_avaliado_numerico = None

v_avaliado_numerico = None

a_avaliado_numerico = None


# =============================================================
# 9. RESULTADOS DOS EXTREMOS
# =============================================================

extremos_tipo = "nao_aplicavel"

extremos_mensagem = ""

extremos_grandeza_nome = ""

extremos_unidade = ""

minimo_valor_exato = ""

minimo_valor_numerico = None

minimo_tempos_exatos = []

minimo_tempos_numericos = []

maximo_valor_exato = ""

maximo_valor_numerico = None

maximo_tempos_exatos = []

maximo_tempos_numericos = []


# =============================================================
# 10. FUNÇÕES AUXILIARES
# =============================================================

def numero_real(expr):

    valor = sp.N(expr)

    return float(valor)


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


    # ---------------------------------------------------------
    # GRANDEZA CONSTANTE
    # ---------------------------------------------------------

    if sp.simplify(
        derivada
    ) == 0:

        valor = sp.simplify(
            expressao.subs(
                t,
                t_inicial_exato
            )
        )


        resultado["tipo"] = (
            "constante"
        )

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


    # ---------------------------------------------------------
    # PONTOS CRÍTICOS
    # ---------------------------------------------------------

    estacionarios = sp.solveset(
        derivada,
        t,
        domain=dominio
    )


    candidatos = []


    # As fronteiras sempre devem ser avaliadas.
    adicionar_candidato(
        candidatos,
        t_inicial_exato
    )

    adicionar_candidato(
        candidatos,
        t_final_exato
    )


    # ---------------------------------------------------------
    # DERIVADA SEM RAÍZES
    # ---------------------------------------------------------

    if estacionarios == sp.EmptySet:

        pass


    # ---------------------------------------------------------
    # CONJUNTO FINITO DE PONTOS CRÍTICOS
    # ---------------------------------------------------------

    elif isinstance(
        estacionarios,
        sp.FiniteSet
    ):

        for ponto in estacionarios:

            adicionar_candidato(
                candidatos,
                ponto
            )


    # ---------------------------------------------------------
    # TODO O DOMÍNIO É ESTACIONÁRIO
    # ---------------------------------------------------------

    elif estacionarios == dominio:

        valor = sp.simplify(
            expressao.subs(
                t,
                t_inicial_exato
            )
        )


        resultado["tipo"] = (
            "constante"
        )

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


    # ---------------------------------------------------------
    # SOLUÇÃO SIMBÓLICA NÃO FINITA
    # ---------------------------------------------------------

    else:

        resultado["tipo"] = (
            "limitacao"
        )

        resultado[
            "mensagem"
        ] = (
            "Não foi possível reduzir simbolicamente "
            "os pontos críticos a um conjunto finito "
            "de instantes."
        )


        return resultado


    # ---------------------------------------------------------
    # ORDENA OS CANDIDATOS POR TEMPO
    # ---------------------------------------------------------

    candidatos = sorted(
        candidatos,
        key=numero_real
    )


    valores = []


    # ---------------------------------------------------------
    # AVALIA A GRANDEZA EM TODOS OS CANDIDATOS
    # ---------------------------------------------------------

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


    # ---------------------------------------------------------
    # VALORES MÍNIMO E MÁXIMO
    # ---------------------------------------------------------

    min_num = min(
        item["valor_num"]
        for item
        in valores
    )

    max_num = max(
        item["valor_num"]
        for item
        in valores
    )


    # Tolerância usada apenas para detectar empates numéricos.
    tolerancia_min = (
        1e-10
        *
        max(
            1.0,
            abs(min_num)
        )
    )

    tolerancia_max = (
        1e-10
        *
        max(
            1.0,
            abs(max_num)
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


    # ---------------------------------------------------------
    # RESULTADO DO MÍNIMO
    # ---------------------------------------------------------

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
            item["t_exato"]
        )

        for item
        in min_itens
    ]

    resultado[
        "min_t_nums"
    ] = [

        item["t_num"]

        for item
        in min_itens
    ]


    # ---------------------------------------------------------
    # RESULTADO DO MÁXIMO
    # ---------------------------------------------------------

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
            item["t_exato"]
        )

        for item
        in max_itens
    ]

    resultado[
        "max_t_nums"
    ] = [

        item["t_num"]

        for item
        in max_itens
    ]


    return resultado


# =============================================================
# 11. MODO: MOSTRAR MODELO
# =============================================================

if acao == "modelo":

    tipo_operacao = "modelo"


# =============================================================
# 12. MODO: AVALIAR ESTADO
# =============================================================

elif acao == "avaliar":

    tipo_operacao = (
        "avaliacao"
    )


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


    instante_exato = str(
        sp.simplify(
            instante
        )
    )

    instante_numerico = (
        instante_num
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

        avaliacao_valida = False

        avaliacao_mensagem = (
            "O instante informado está fora "
            "do domínio físico."
        )


    else:

        avaliacao_valida = True


        x_t0 = sp.simplify(
            x.subs(
                t,
                instante
            )
        )

        v_t0 = sp.simplify(
            v.subs(
                t,
                instante
            )
        )

        a_t0 = sp.simplify(
            a.subs(
                t,
                instante
            )
        )


        x_avaliado_exato = str(
            x_t0
        )

        v_avaliado_exato = str(
            v_t0
        )

        a_avaliado_exato = str(
            a_t0
        )


        x_avaliado_numerico = (
            numero_real(
                x_t0
            )
        )

        v_avaliado_numerico = (
            numero_real(
                v_t0
            )
        )

        a_avaliado_numerico = (
            numero_real(
                a_t0
            )
        )


# =============================================================
# 13. EVENTO DE POSIÇÃO
# =============================================================

elif acao == "posicao":

    tipo_operacao = "evento"

    expressao_evento = x

    grandeza_nome = "x(t)"

    unidade = "m"

    alvo = sp.sympify(
        valor_extra_js
    )


# =============================================================
# 14. EVENTO DE VELOCIDADE
# =============================================================

elif acao == "velocidade":

    tipo_operacao = "evento"

    expressao_evento = v

    grandeza_nome = "v(t)"

    unidade = "m/s"

    alvo = sp.sympify(
        valor_extra_js
    )


# =============================================================
# 15. EVENTO DE ACELERAÇÃO
# =============================================================

elif acao == "aceleracao":

    tipo_operacao = "evento"

    expressao_evento = a

    grandeza_nome = "a(t)"

    unidade = "m/s²"

    alvo = sp.sympify(
        valor_extra_js
    )


# =============================================================
# 16. QUANDO A PARTÍCULA PARA
# =============================================================

elif acao == "parar":

    tipo_operacao = "evento"

    expressao_evento = v

    grandeza_nome = "v(t)"

    unidade = "m/s"

    alvo = sp.Integer(0)


# =============================================================
# 17. EXTREMOS DE POSIÇÃO
# =============================================================

elif acao == "extremos_posicao":

    tipo_operacao = (
        "extremos"
    )

    extremos_grandeza_nome = (
        "posição x(t)"
    )

    extremos_unidade = "m"


    # Para extremos de x(t),
    # procuramos onde dx/dt = v(t) = 0.
    dados_extremos = (
        calcular_extremos_globais(
            x,
            v
        )
    )


# =============================================================
# 18. EXTREMOS DE VELOCIDADE
# =============================================================

elif acao == "extremos_velocidade":

    tipo_operacao = (
        "extremos"
    )

    extremos_grandeza_nome = (
        "velocidade v(t)"
    )

    extremos_unidade = "m/s"


    # Para extremos de v(t),
    # procuramos onde dv/dt = a(t) = 0.
    dados_extremos = (
        calcular_extremos_globais(
            v,
            a
        )
    )


else:

    raise ValueError(
        "Ação desconhecida."
    )


# =============================================================
# 19. RESOLUÇÃO DOS EVENTOS
# =============================================================

if tipo_operacao == "evento":

    if alvo.free_symbols:

        raise ValueError(
            "O valor-alvo não pode conter variáveis."
        )


    solucoes = sp.solveset(
        expressao_evento - alvo,
        t,
        domain=dominio
    )


    if solucoes == sp.EmptySet:

        tipo_evento = (
            "nenhuma"
        )


    elif solucoes == dominio:

        tipo_evento = (
            "todo_dominio"
        )


    elif isinstance(
        solucoes,
        sp.FiniteSet
    ):

        tipo_evento = (
            "pontos"
        )


        solucoes_ordenadas = sorted(
            list(
                solucoes
            ),
            key=numero_real
        )


        solucoes_exatas = [

            str(
                sp.simplify(
                    valor
                )
            )

            for valor
            in solucoes_ordenadas
        ]


        solucoes_numericas = [

            numero_real(
                valor
            )

            for valor
            in solucoes_ordenadas
        ]


    else:

        tipo_evento = (
            "nao_reduzido"
        )

        solucoes_exatas = [
            str(
                solucoes
            )
        ]


# =============================================================
# 20. RESULTADOS DOS EXTREMOS
# =============================================================

if tipo_operacao == "extremos":

    extremos_tipo = (
        dados_extremos[
            "tipo"
        ]
    )

    extremos_mensagem = (
        dados_extremos[
            "mensagem"
        ]
    )


    minimo_valor_exato = (
        dados_extremos[
            "min_val_exato"
        ]
    )

    minimo_valor_numerico = (
        dados_extremos[
            "min_val_num"
        ]
    )

    minimo_tempos_exatos = (
        dados_extremos[
            "min_t_exatos"
        ]
    )

    minimo_tempos_numericos = (
        dados_extremos[
            "min_t_nums"
        ]
    )


    maximo_valor_exato = (
        dados_extremos[
            "max_val_exato"
        ]
    )

    maximo_valor_numerico = (
        dados_extremos[
            "max_val_num"
        ]
    )

    maximo_tempos_exatos = (
        dados_extremos[
            "max_t_exatos"
        ]
    )

    maximo_tempos_numericos = (
        dados_extremos[
            "max_t_nums"
        ]
    )


# =============================================================
# 21. RESULTADO ENVIADO AO JAVASCRIPT
# =============================================================

resultado_python = {

    "x":
        str(
            sp.factor(x)
        ),

    "v":
        str(
            sp.factor(v)
        ),

    "a":
        str(
            sp.factor(a)
        ),

    "t_inicial":
        t_inicial,

    "t_final":
        t_final,

    "acao":
        acao,

    "tipo_operacao":
        tipo_operacao,


    # ---------------------------------------------------------
    # Eventos
    # ---------------------------------------------------------

    "grandeza_nome":
        grandeza_nome,

    "unidade":
        unidade,

    "alvo":
        (
            str(
                sp.simplify(
                    alvo
                )
            )
            if alvo is not None
            else ""
        ),

    "tipo_evento":
        tipo_evento,

    "solucoes_exatas":
        solucoes_exatas,

    "solucoes_numericas":
        solucoes_numericas,


    # ---------------------------------------------------------
    # Avaliação
    # ---------------------------------------------------------

    "instante_exato":
        instante_exato,

    "instante_numerico":
        instante_numerico,

    "avaliacao_valida":
        avaliacao_valida,

    "avaliacao_mensagem":
        avaliacao_mensagem,

    "x_avaliado_exato":
        x_avaliado_exato,

    "v_avaliado_exato":
        v_avaliado_exato,

    "a_avaliado_exato":
        a_avaliado_exato,

    "x_avaliado_numerico":
        x_avaliado_numerico,

    "v_avaliado_numerico":
        v_avaliado_numerico,

    "a_avaliado_numerico":
        a_avaliado_numerico,


    # ---------------------------------------------------------
    # Extremos
    # ---------------------------------------------------------

    "extremos_tipo":
        extremos_tipo,

    "extremos_mensagem":
        extremos_mensagem,

    "extremos_grandeza_nome":
        extremos_grandeza_nome,

    "extremos_unidade":
        extremos_unidade,

    "minimo_valor_exato":
        minimo_valor_exato,

    "minimo_valor_numerico":
        minimo_valor_numerico,

    "minimo_tempos_exatos":
        minimo_tempos_exatos,

    "minimo_tempos_numericos":
        minimo_tempos_numericos,

    "maximo_valor_exato":
        maximo_valor_exato,

    "maximo_valor_numerico":
        maximo_valor_numerico,

    "maximo_tempos_exatos":
        maximo_tempos_exatos,

    "maximo_tempos_numericos":
        maximo_tempos_numericos
}


resultado_python
            `);


        /*
            ====================================================
            PYTHON -> JAVASCRIPT
            ====================================================
        */
        const dados =
            resposta.toJs({
                dict_converter:
                    Object.fromEntries
            });


        /*
            ====================================================
            BLOCO COMUM
            ====================================================
        */
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
            AVALIAÇÃO EM t0
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
            EXTREMOS GLOBAIS
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


            /*
                Caso em que o SymPy não conseguiu
                reduzir os pontos críticos.
            */
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


            /*
                Grandeza constante.
            */
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


            /*
                Extremos determinados normalmente.
            */
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
    atualizarCampoExtra
);


botao.addEventListener(
    "click",
    calcularMovimento
);


atualizarCampoExtra();


iniciarPython();