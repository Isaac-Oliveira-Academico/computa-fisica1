const botao = document.getElementById("calcular");
const resultado = document.getElementById("resultado");
const status = document.getElementById("status");

const seletorAcao = document.getElementById("acao");
const alvoContainer = document.getElementById("alvo-container");
const campoAlvo = document.getElementById("alvo");

let pyodide = null;


/*
    Inicializa o interpretador Python no navegador
    e carrega a biblioteca SymPy.
*/
async function iniciarPython() {

    status.textContent = "Carregando Python...";

    pyodide = await loadPyodide();

    status.textContent = "Carregando SymPy...";

    await pyodide.loadPackage("sympy");

    status.textContent = "Motor Python/SymPy pronto.";

    botao.disabled = false;
    botao.textContent = "Calcular";
}


/*
    Algumas perguntas precisam de um valor-alvo.

    Exemplo:

    x(t) = 300
    v(t) = 20
    a(t) = -9.8

    Já as opções "modelo" e "parar" não precisam,
    porque "parar" significa automaticamente v(t) = 0.
*/
function atualizarCampoAlvo() {

    const acao = seletorAcao.value;

    const precisaAlvo =
        acao === "posicao" ||
        acao === "velocidade" ||
        acao === "aceleracao";

    alvoContainer.hidden = !precisaAlvo;
}


/*
    Nesta primeira versão pública, aceitamos expressões
    algébricas simples em t.

    Exemplos válidos:

    20*t - 5*t**3
    12*t**2 - 2*t**3
    15*t**2/2
    7

    A restrição evita que uma entrada arbitrária seja
    executada pelo interpretador simbólico.
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
    O valor-alvo deve ser uma expressão numérica.

    Exemplos:

    300
    -5
    1/2
    9.8
*/
function alvoValido(texto) {

    const padrao =
        /^[0-9+\-*/().\s]+$/;

    return (
        texto.trim().length > 0 &&
        padrao.test(texto)
    );
}


/*
    Função principal da aplicação.

    1. Lê os dados da interface.
    2. Valida os dados.
    3. Envia os valores ao Python.
    4. SymPy constrói x(t), v(t) e a(t).
    5. Se necessário, resolve um evento físico.
    6. Mostra o resultado no navegador.
*/
async function calcularMovimento() {

    const funcao =
        document.getElementById("funcao").value.trim();

    const tInicial =
        Number(
            document.getElementById("t-inicial").value
        );

    const tFinal =
        Number(
            document.getElementById("t-final").value
        );

    const acao =
        seletorAcao.value;

    const alvoTexto =
        campoAlvo.value.trim();


    /*
        Validação da função fornecida.
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
        Validação do domínio físico.
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
        As três perguntas genéricas precisam
        de um valor-alvo.
    */
    const precisaAlvo =
        acao === "posicao" ||
        acao === "velocidade" ||
        acao === "aceleracao";


    if (
        precisaAlvo &&
        !alvoValido(alvoTexto)
    ) {

        resultado.innerHTML = `
            <p>
                Erro: informe um valor procurado válido.
            </p>

            <p>
                Exemplos: 300, -5, 1/2 ou 9.8
            </p>
        `;

        return;
    }


    /*
        Transferência dos dados JavaScript
        para o ambiente Python/Pyodide.
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
        "alvo_js",
        precisaAlvo ? alvoTexto : ""
    );


    try {

        /*
            Este bloco é Python real executado
            dentro do navegador através do Pyodide.
        */
        const resposta =
            await pyodide.runPythonAsync(`

import sympy as sp


# ---------------------------------------------------------
# 1. Variável simbólica
# ---------------------------------------------------------

t = sp.symbols(
    "t",
    real=True
)


# ---------------------------------------------------------
# 2. Função posição x(t)
# ---------------------------------------------------------

x = sp.sympify(
    funcao_js,
    locals={
        "t": t
    }
)


# Segurança conceitual:
# nesta etapa do projeto aceitamos apenas t
# como variável simbólica.
if not x.free_symbols.issubset({t}):

    raise ValueError(
        "A função só pode depender de t."
    )


# ---------------------------------------------------------
# 3. Cinemática diferencial
# ---------------------------------------------------------

v = sp.diff(
    x,
    t
)

a = sp.diff(
    v,
    t
)


# ---------------------------------------------------------
# 4. Domínio físico
# ---------------------------------------------------------

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


# ---------------------------------------------------------
# 5. Configuração do evento físico
# ---------------------------------------------------------

acao = str(
    acao_js
)

tipo_evento = "nao_aplicavel"

grandeza_nome = ""
unidade = ""

alvo = None

solucoes = None

solucoes_exatas = []
solucoes_numericas = []


if acao == "posicao":

    expressao_evento = x

    grandeza_nome = "x(t)"
    unidade = "m"

    alvo = sp.sympify(
        alvo_js
    )


elif acao == "velocidade":

    expressao_evento = v

    grandeza_nome = "v(t)"
    unidade = "m/s"

    alvo = sp.sympify(
        alvo_js
    )


elif acao == "aceleracao":

    expressao_evento = a

    grandeza_nome = "a(t)"
    unidade = "m/s²"

    alvo = sp.sympify(
        alvo_js
    )


elif acao == "parar":

    expressao_evento = v

    grandeza_nome = "v(t)"
    unidade = "m/s"

    alvo = sp.Integer(0)


elif acao == "modelo":

    expressao_evento = None


else:

    raise ValueError(
        "Ação desconhecida."
    )


# ---------------------------------------------------------
# 6. Validação do valor-alvo
# ---------------------------------------------------------

if alvo is not None:

    if alvo.free_symbols:

        raise ValueError(
            "O valor-alvo não pode conter variáveis."
        )


# ---------------------------------------------------------
# 7. Resolver evento físico
#
#    expressão(t) = alvo
#
#    é equivalente a:
#
#    expressão(t) - alvo = 0
# ---------------------------------------------------------

if expressao_evento is not None:

    solucoes = sp.solveset(
        expressao_evento - alvo,
        t,
        domain=dominio
    )


    # -----------------------------------------------------
    # Nenhuma solução dentro do domínio
    # -----------------------------------------------------

    if solucoes == sp.EmptySet:

        tipo_evento = "nenhuma"


    # -----------------------------------------------------
    # A condição é satisfeita em todo o domínio
    # -----------------------------------------------------

    elif solucoes == dominio:

        tipo_evento = "todo_dominio"


    # -----------------------------------------------------
    # Um conjunto finito de instantes
    # -----------------------------------------------------

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


    # -----------------------------------------------------
    # SymPy encontrou uma solução simbólica mais geral
    # -----------------------------------------------------

    else:

        tipo_evento = "nao_reduzido"

        solucoes_exatas = [
            str(solucoes)
        ]


# ---------------------------------------------------------
# 8. Resultado devolvido ao JavaScript
# ---------------------------------------------------------

resultado_python = {

    "x": str(
        sp.factor(x)
    ),

    "v": str(
        sp.factor(v)
    ),

    "a": str(
        sp.factor(a)
    ),

    "t_inicial":
        t_inicial,

    "t_final":
        t_final,

    "acao":
        acao,

    "tipo_evento":
        tipo_evento,

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

    "solucoes_exatas":
        solucoes_exatas,

    "solucoes_numericas":
        solucoes_numericas
}


resultado_python
            `);


        /*
            Converte o dicionário Python
            para um objeto JavaScript.
        */
        const dados =
            resposta.toJs({
                dict_converter:
                    Object.fromEntries
            });


        /*
            Parte comum a todas as respostas.
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
            Se a opção escolhida for somente
            "Mostrar x(t), v(t) e a(t)",
            não existe evento adicional.
        */
        if (acao !== "modelo") {

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
                Caso 1:
                nenhuma solução.
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
                Caso 2:
                toda a faixa temporal é solução.
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


                if (acao === "parar") {

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
                Caso 3:
                um ou mais instantes isolados.
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
                            dados.solucoes_numericas[i]
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
                Caso 4:
                SymPy devolveu uma solução
                simbólica mais complexa.
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


        resultado.innerHTML =
            html;


        /*
            Libera o objeto Python mantido
            temporariamente pelo Pyodide.
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
                ou resolver a função fornecida.
            </p>

            <p>
                Verifique a expressão,
                o domínio e o valor procurado.
            </p>
        `;
    }
}


/*
    Ao mudar a pergunta,
    mostramos ou escondemos
    o campo de valor-alvo.
*/
seletorAcao.addEventListener(
    "change",
    atualizarCampoAlvo
);


/*
    Clique no botão principal.
*/
botao.addEventListener(
    "click",
    calcularMovimento
);


/*
    Configura a tela inicial.
*/
atualizarCampoAlvo();


/*
    Inicializa Python e SymPy.
*/
iniciarPython();