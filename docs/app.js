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

    const funcao = document.getElementById("funcao").value;

    const tInicial =
        Number(document.getElementById("t-inicial").value);

    const tFinal =
        Number(document.getElementById("t-final").value);


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

resultado_python = {
    "x": str(sp.factor(x)),
    "v": str(sp.factor(v)),
    "a": str(sp.factor(a)),
    "t_inicial": float(t_inicial_js),
    "t_final": float(t_final_js)
}

resultado_python
        `);


        const dados = resposta.toJs({
            dict_converter: Object.fromEntries
        });


        resultado.innerHTML = `
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


        resposta.destroy();

    }

    catch (erro) {

        console.error(erro);

        resultado.innerHTML = `
            <p>
                Não foi possível interpretar a função fornecida.
            </p>
        `;
    }
}


botao.addEventListener(
    "click",
    calcularMovimento
);


iniciarPython();