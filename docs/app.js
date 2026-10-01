const botao = document.getElementById("calcular");
const resultado = document.getElementById("resultado");
const status = document.getElementById("status");

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


async function calcularMovimento() {

    const funcao =
        document.getElementById("funcao").value;

    const tInicial =
        Number(document.getElementById("t-inicial").value);

    const tFinal =
        Number(document.getElementById("t-final").value);

    const acao =
        document.getElementById("acao").value;


    if (tInicial >= tFinal) {

        resultado.innerHTML =
            "<p>Erro: o tempo final deve ser maior que o inicial.</p>";

        return;
    }


    pyodide.globals.set("funcao_js", funcao);
    pyodide.globals.set("t_inicial_js", tInicial);
    pyodide.globals.set("t_final_js", tFinal);


    try {

        const resposta = await pyodide.runPythonAsync(`

import sympy as sp

t = sp.symbols("t", real=True)

x = sp.sympify(
    funcao_js,
    locals={"t": t}
)

v = sp.diff(x, t)
a = sp.diff(v, t)

t_inicial = float(t_inicial_js)
t_final = float(t_final_js)

dominio = sp.Interval(
    t_inicial,
    t_final
)

solucoes = sp.solveset(
    v,
    t,
    domain=dominio
)


if solucoes == sp.EmptySet:

    tipo_parada = "nenhuma"
    paradas_exatas = []
    paradas_numericas = []


elif isinstance(solucoes, sp.FiniteSet):

    tipo_parada = "pontos"

    solucoes_ordenadas = sorted(
        list(solucoes),
        key=lambda valor: float(sp.N(valor))
    )

    paradas_exatas = [
        str(valor)
        for valor in solucoes_ordenadas
    ]

    paradas_numericas = [
        float(sp.N(valor))
        for valor in solucoes_ordenadas
    ]


elif solucoes == dominio:

    tipo_parada = "todo_dominio"
    paradas_exatas = []
    paradas_numericas = []


else:

    tipo_parada = "nao_reduzido"
    paradas_exatas = [str(solucoes)]
    paradas_numericas = []


resultado_python = {
    "x": str(sp.factor(x)),
    "v": str(sp.factor(v)),
    "a": str(sp.factor(a)),
    "t_inicial": t_inicial,
    "t_final": t_final,
    "tipo_parada": tipo_parada,
    "paradas_exatas": paradas_exatas,
    "paradas_numericas": paradas_numericas
}

resultado_python
        `);


        const dados = resposta.toJs({
            dict_converter: Object.fromEntries
        });


        let html = `
            <p>
                <strong>Domínio:</strong>
                ${dados.t_inicial} ≤ t ≤ ${dados.t_final}
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


        if (acao === "parar") {

            html += `
                <hr>

                <p>
                    <strong>Condição física:</strong>
                    v(t) = 0
                </p>
            `;


            if (dados.tipo_parada === "nenhuma") {

                html += `
                    <p>
                        A partícula não para dentro
                        do domínio informado.
                    </p>
                `;
            }


            else if (dados.tipo_parada === "todo_dominio") {

                html += `
                    <p>
                        A velocidade é zero em todo
                        o domínio informado.
                    </p>

                    <p>
                        A partícula permanece em repouso.
                    </p>
                `;
            }


            else if (dados.tipo_parada === "pontos") {

                html += `
                    <p>
                        <strong>Instantes encontrados:</strong>
                    </p>

                    <ul>
                `;


                for (
                    let i = 0;
                    i < dados.paradas_numericas.length;
                    i++
                ) {

                    const exata =
                        dados.paradas_exatas[i];

                    const numerica =
                        dados.paradas_numericas[i];


                    html += `
                        <li>
                            t = ${numerica.toFixed(9)} s
                            &nbsp;
                            (${exata})
                        </li>
                    `;
                }


                html += `
                    </ul>
                `;
            }


            else {

                html += `
                    <p>
                        O SymPy encontrou uma solução,
                        mas ela não pôde ser reduzida
                        automaticamente a instantes isolados.
                    </p>

                    <p>
                        ${dados.paradas_exatas[0]}
                    </p>
                `;
            }
        }


        resultado.innerHTML = html;

        resposta.destroy();

    }

    catch (erro) {

        console.error(erro);

        resultado.innerHTML = `
            <p>
                Não foi possível interpretar
                ou resolver a função fornecida.
            </p>
        `;
    }
}


botao.addEventListener(
    "click",
    calcularMovimento
);


iniciarPython();