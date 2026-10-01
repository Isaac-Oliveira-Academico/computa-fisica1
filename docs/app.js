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


/*
    ------------------------------------------------------------
    INICIALIZAÇÃO DO PYTHON
    ------------------------------------------------------------

    Pyodide permite executar Python dentro do navegador.

    Depois carregamos SymPy, que será responsável
    pelos cálculos simbólicos.
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
    ------------------------------------------------------------
    CONFIGURAÇÃO DA INTERFACE
    ------------------------------------------------------------

    Algumas operações precisam de uma entrada extra.

    Exemplos:

    avaliar:
        t0 = 3

    posição:
        x(t) = 300

    velocidade:
        v(t) = 20

    aceleração:
        a(t) = -9.8

    Já as opções:

        modelo
        parar

    não precisam desse campo.
*/
function atualizarCampoExtra() {

    const acao =
        seletorAcao.value;


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


    /*
        modelo e parar
    */
    entradaExtraContainer.hidden =
        true;
}


/*
    ------------------------------------------------------------
    VALIDAÇÃO DA FUNÇÃO x(t)
    ------------------------------------------------------------

    Nesta fase do projeto aceitamos expressões algébricas
    simples envolvendo t.

    Exemplos:

        20*t - 5*t**3
        12*t**2 - 2*t**3
        15*t**2/2
        7
*/
function funcaoValida(texto) {

    const padrao =
        /^[0-9tT+\-*/().\s]+$/;

    return (
        texto.trim().length > 0 &&
        padrao.test(texto)
    );
}


/*
    ------------------------------------------------------------
    VALIDAÇÃO DE VALORES NUMÉRICOS SIMBÓLICOS
    ------------------------------------------------------------

    Permite:

        3
        -5
        1/2
        2.5

    mas não permite variáveis.
*/
function valorExtraValido(texto) {

    const padrao =
        /^[0-9+\-*/().\s]+$/;

    return (
        texto.trim().length > 0 &&
        padrao.test(texto)
    );
}


/*
    ------------------------------------------------------------
    FORMATAÇÃO DOS RESULTADOS
    ------------------------------------------------------------

    Se o valor exato for simplesmente um número,
    mostramos apenas esse valor.

    Se for algo simbólico, como:

        2*sqrt(10)

    mostramos também uma aproximação decimal.
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

        return `
            ${exato} ${unidade}
        `;
    }


    return `
        ${exato} ${unidade}
        (≈ ${numerico.toFixed(9)} ${unidade})
    `;
}


/*
    ------------------------------------------------------------
    FUNÇÃO PRINCIPAL
    ------------------------------------------------------------

    Fluxo:

    1. Lê os dados da página.
    2. Valida os dados.
    3. Envia para Python.
    4. SymPy constrói x(t), v(t) e a(t).
    5. Executa a operação física escolhida.
    6. Devolve os resultados ao JavaScript.
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


    /*
        --------------------------------------------------------
        AÇÕES QUE PRECISAM DE UMA ENTRADA EXTRA
        --------------------------------------------------------
    */
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
        ENVIO DOS DADOS PARA O PYTHON
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

        /*
            ====================================================
            PYTHON EXECUTADO DENTRO DO NAVEGADOR
            ====================================================
        */
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
# 2. CONSTRUÇÃO DA FUNÇÃO POSIÇÃO
# =============================================================

x = sp.sympify(
    funcao_js,
    locals={
        "t": t
    }
)


# A função só pode depender de t.
if not x.free_symbols.issubset({t}):

    raise ValueError(
        "A função só pode depender de t."
    )


# =============================================================
# 3. CINEMÁTICA DIFERENCIAL
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

t_inicial = float(
    t_inicial_js
)

t_final = float(
    t_final_js
)

dominio = sp.Interval(
    t_inicial,
    t_final
)


# =============================================================
# 5. AÇÃO ESCOLHIDA
# =============================================================

acao = str(
    acao_js
)


# =============================================================
# 6. VARIÁVEIS DE RESULTADO
# =============================================================

tipo_operacao = ""

grandeza_nome = ""

unidade = ""

alvo = None

tipo_evento = "nao_aplicavel"

solucoes_exatas = []

solucoes_numericas = []


# Resultados da avaliação em t0
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
# 7. MODO: APENAS MOSTRAR O MODELO
# =============================================================

if acao == "modelo":

    tipo_operacao = "modelo"


# =============================================================
# 8. MODO: AVALIAR ESTADO EM t0
# =============================================================

elif acao == "avaliar":

    tipo_operacao = "avaliacao"

    instante = sp.sympify(
        valor_extra_js
    )


    if instante.free_symbols:

        raise ValueError(
            "O instante não pode conter variáveis."
        )


    instante_num = float(
        sp.N(instante)
    )


    instante_exato = str(
        sp.simplify(instante)
    )

    instante_numerico = (
        instante_num
    )


    # ---------------------------------------------------------
    # O instante precisa pertencer ao domínio físico.
    # ---------------------------------------------------------

    if (
        instante_num < t_inicial
        or
        instante_num > t_final
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


        x_avaliado_numerico = float(
            sp.N(x_t0)
        )

        v_avaliado_numerico = float(
            sp.N(v_t0)
        )

        a_avaliado_numerico = float(
            sp.N(a_t0)
        )


# =============================================================
# 9. EVENTO DE POSIÇÃO
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
# 10. EVENTO DE VELOCIDADE
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
# 11. EVENTO DE ACELERAÇÃO
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
# 12. QUANDO A PARTÍCULA PARA
# =============================================================

elif acao == "parar":

    tipo_operacao = "evento"

    expressao_evento = v

    grandeza_nome = "v(t)"

    unidade = "m/s"

    alvo = sp.Integer(0)


else:

    raise ValueError(
        "Ação desconhecida."
    )


# =============================================================
# 13. RESOLUÇÃO DO EVENTO
# =============================================================

if tipo_operacao == "evento":

    if alvo.free_symbols:

        raise ValueError(
            "O valor-alvo não pode conter variáveis."
        )


        # Queremos resolver:
        #
        #     expressão(t) = alvo
        #
        # que equivale a:
        #
        #     expressão(t) - alvo = 0

    solucoes = sp.solveset(
        expressao_evento - alvo,
        t,
        domain=dominio
    )


    # ---------------------------------------------------------
    # Nenhuma solução
    # ---------------------------------------------------------

    if solucoes == sp.EmptySet:

        tipo_evento = "nenhuma"


    # ---------------------------------------------------------
    # Todo o domínio é solução
    # ---------------------------------------------------------

    elif solucoes == dominio:

        tipo_evento = "todo_dominio"


    # ---------------------------------------------------------
    # Instantes isolados
    # ---------------------------------------------------------

    elif isinstance(
        solucoes,
        sp.FiniteSet
    ):

        tipo_evento = "pontos"


        solucoes_ordenadas = sorted(
            list(solucoes),
            key=lambda valor:
                float(
                    sp.N(valor)
                )
        )


        solucoes_exatas = [
            str(
                sp.simplify(valor)
            )
            for valor
            in solucoes_ordenadas
        ]


        solucoes_numericas = [
            float(
                sp.N(valor)
            )
            for valor
            in solucoes_ordenadas
        ]


    # ---------------------------------------------------------
    # Solução simbólica mais complexa
    # ---------------------------------------------------------

    else:

        tipo_evento = "nao_reduzido"

        solucoes_exatas = [
            str(solucoes)
        ]


# =============================================================
# 14. OBJETO DEVOLVIDO AO JAVASCRIPT
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

    "grandeza_nome":
        grandeza_nome,

    "unidade":
        unidade,

    "alvo":
        (
            str(
                sp.simplify(alvo)
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
        a_avaliado_numerico
}


resultado_python
            `);


        /*
            ====================================================
            CONVERSÃO PYTHON -> JAVASCRIPT
            ====================================================
        */
        const dados =
            resposta.toJs({
                dict_converter:
                    Object.fromEntries
            });


        /*
            ====================================================
            BLOCO COMUM DO RESULTADO
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
            RESULTADO DA AVALIAÇÃO EM t0
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
                        <strong>Estado da partícula:</strong>
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
            RESULTADO DOS EVENTOS
            ====================================================
        */
        if (
            dados.tipo_operacao ===
            "evento"
        ) {

            html += `
                <hr>

                <p>
                    <strong>Condição física:</strong>

                    ${dados.grandeza_nome}
                    =
                    ${dados.alvo}
                    ${dados.unidade}
                </p>
            `;


            /*
                Nenhuma solução.
            */
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


            /*
                Todo o domínio.
            */
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


            /*
                Instantes isolados.
            */
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

                    <ul>
                `;


                for (
                    let i = 0;
                    i <
                    dados.solucoes_numericas.length;
                    i++
                ) {

                    const exata =
                        dados.solucoes_exatas[i];

                    const numerica =
                        Number(
                            dados
                                .solucoes_numericas[i]
                        );


                    html += `
                        <li>
                            t =
                            ${numerica.toFixed(9)}
                            s
                            &nbsp;
                            (${exata})
                        </li>
                    `;
                }


                html += `
                    </ul>
                `;
            }


            /*
                Solução simbólica não reduzida.
            */
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
            MOSTRAR RESULTADO NA PÁGINA
            ====================================================
        */
        resultado.innerHTML =
            html;


        /*
            Libera memória do objeto Python.
        */
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


/*
    Mudança da opção do menu.
*/
seletorAcao.addEventListener(
    "change",
    atualizarCampoExtra
);


/*
    Botão principal.
*/
botao.addEventListener(
    "click",
    calcularMovimento
);


/*
    Configuração inicial da interface.
*/
atualizarCampoExtra();


/*
    Inicialização do motor.
*/
iniciarPython();