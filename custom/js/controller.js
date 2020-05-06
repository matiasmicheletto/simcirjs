const DEBUG = false; // Modo debuggeo
const simpleCrypto = new SimpleCrypto("simcirjmkey"); // Libreria de encriptacion

var loadCircuit = function(model){ // Cargar modelo al simulador
    simcir.clearDevices(); // Borrar caches de managers

    // Poner barra de herramientas
    model.showToolbox = true;
    model.width = document.getElementById("simcir").clientWidth;
    model.height = document.getElementById("simcir").clientHeight
    model.toolbox = [
        {"type":"In"},{"type":"Out"},{"type":"Joint"},{"type":"DC"},
        {"type":"LED"},{"type":"PushOff"},{"type":"PushOn"},{"type":"Toggle"},{"type":"BUF"},
        {"type":"NOT"},{"type":"AND"},{"type":"NAND"},{"type":"OR"},{"type":"NOR"},
        {"type":"XOR"},{"type":"XNOR"},{"type":"OSC"},{"type":"7seg"},{"type":"16seg"},
        {"type":"4bit7seg"},{"type":"RotaryEncoder"},{"type":"BusIn"},{"type":"BusOut"},
        {"type":"RS-FF"},{"type":"JK-FF"},{"type":"T-FF"},{"type":"D-FF"},{"type":"8bitCounter"},
        {"type":"HalfAdder"},{"type":"FullAdder"},{"type":"4bitAdder"},{"type":"2to4BinaryDecoder"},
        {"type":"3to8BinaryDecoder"},{"type":"4to16BinaryDecoder"},{"type":"Test-In"},{"type":"Test-Out"},
        {"type":"Audio-Out"},{"type":"Transmitter"},{"type":"DSO"}
    ];
    simcir.setupSimcir($('#simcir'), model);
};

var saveFile = function (content, fileName, contentType) { // Exportar archivo binario al cliente
    var a = document.createElement("a");
    var file = new Blob([content], {
        type: contentType
    });
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
};

var simexport = function (type) { // Exportar el modelo a distintos formatos
    var modelData = simcir.controller($('#simcir').find('.simcir-workspace')).data(); // Objeto con datos de simulacion
    //var data = JSON.stringify((({ devices, connectors }) => ({ devices, connectors }))(model)); // Solo guardar dos propiedades

    if(modelData.devices.length == 0){ // No guardar si no hay componentes
        toastr.error("No hay componentes!");
    }else{ // Si hay al menos un componente, guardar en db        
        var model = (function(model){return {devices:modelData.devices, connectors:modelData.connectors, timestamp: Date.now()};})(model);  // Solo guardar dos propiedades
        switch(type){
            case "txt": // Exportar como arhivo de texto plano
                saveFile(JSON.stringify(model), 'model.simcir', 'text/json');
                break;
            case "url": // Exportar mediante url
                var data = JSON.stringify(model); // Convertir a string y codificar para pasar como link
                var cipheredModel = encodeURIComponent(simpleCrypto.encrypt(data)); // Encriptar
                var url = DEBUG ? "http://localhost:8080/index.html?model="+cipheredModel : "https://matiasmicheletto.github.io/simcirjs?model="+cipheredModel; // Generar url
                // Mostrar url en modal
                var ref = document.getElementById("shareUrl");
                ref.href = url;
                ref.innerHTML = url;
                $("#share-modal").modal("show");
                break;
            default:
                break;
        }
    }
};

var simimport = function(){ // Importar simulacion desde archivo json
    var fr = new FileReader();    
    fr.onloadend = function(e) { // Callback carga finalizada
        var data = JSON.parse(e.target.result); 
        if(DEBUG) console.log(data);
        loadCircuit(data);
    };
    var input = document.createElement('input');
    input.type = "file";
    input.style.display = "none";
    input.addEventListener('change', function(){  
      fr.readAsText(input.files[0]);
    }, false); // Al elegir archivo, leer
    input.click(); // Abrir dialogo para cargar archivo
};




var analyze = function(){ // Analisis combinacional del circuito
    // Las funciones declaradas mas abajo se ejecutan desde el final hacia arriba

    // Obtener nombres de las entradas y salidas
    var inputs = simcir.getExternalLabels("input");
    var outputs = simcir.getExternalLabels("output");

    // Si no hay, retornar
    if(inputs.length == 0){
        toastr.error("El circuito no tiene entradas de testeo!");
        return;
    }

    if(outputs.length == 0){
        toastr.error("El circuito no tiene salidas de testeo!");
        return;
    }

    // Cantidad de entradas y salidas (para calcular cantidad de dispositivos) 
    // (Antes de eliminar nodos repetidos)
    var ioDevices = inputs.length + outputs.length;

    // Eliminar nombres repetidos (externalPortManager sigue teniendo duplicados si se carga varias veces)
    inputs = inputs.filter(function(value, index, self){ return self.indexOf(value) === index}); 
    //outputs = outputs.filter((value, index, self) => self.indexOf(value) === index); 

    var model = simcir.controller($('#simcir').find('.simcir-workspace')).data();

    // Objeto para mostrar resultados en modal
    var results = {
        model: model,
        deviceCnt: model.devices.length - ioDevices, // Cantidad de componentes sin contar entradas y salidas
        connectorCnt: model.connectors.length,
        truthTable: { // Objeto para genrar la tabla de verdad en la vista
            header:{ // Nombres de las variables de entrada y salida
                inputs:inputs,
                outputs:outputs
            },
            rows:[] // Combinaciones de entrada
        },
        expressions: [], // Funciones de salida minimizadas
        canonMinTerm: [], // Funciones de salida canonicas suma de productos
        canonMaxTerm: [] // Funciones de salida canonicas producto de sumas
    };

    var combMax = Math.pow(2,inputs.length); // Cantidad de combinaciones
    var minterms = []; // Miniterminos de cada salida
    var maxterms = []; // Maxiterminos de cada salida
    var primeImplicants = [];
    var minifiedExpresions = [];
    var canonMinExpressions = [];
    var canonMaxExpressions = [];


    var getCanonicalExpressions = function(){ // Obtener las expresiones canonicas a partir de miniterminos y maxiterminos
        
        for(var k in outputs){ // Para cada funcion de salida                
            if(!minterms[k]){ // Si no hay minterms, la funcion es siempre nula                    
                canonMinExpressions[k] = "0";
                canonMaxExpressions[k] = "0";
                continue; // Pasar a la siguiente salida
            }

            if(!maxterms[k]){ // Si no hay maxterms, la salida es siempre 1
                canonMinExpressions[k] = "1";
                canonMaxExpressions[k] = "1";
                continue; // Pasar a la siguiente salida
            }
        
            /////// Minterms
            for(var j in minterms[k]){ // Para cada minitermino
                for(var t in minterms[k][j]){ // Para cada variable dentro del termino
                    switch(minterms[k][j][t]){
                        case "1":
                            if(canonMinExpressions[k])
                                canonMinExpressions[k] += inputs[t];
                            else
                                canonMinExpressions[k] = inputs[t];
                            break;
                        case "0":
                            if(canonMinExpressions[k])
                                canonMinExpressions[k] += inputs[t]+"'";
                            else
                                canonMinExpressions[k] = inputs[t]+"'";
                            break;                            
                        default:
                            break;
                    }
                }
                canonMinExpressions[k] += " + ";
            }
            canonMinExpressions[k] = canonMinExpressions[k].substring(0,canonMinExpressions[k].length-3);// Remover el ultimo "+"
        
            /////// Maxterms
            for(var j in maxterms[k]){ // Para cada minitermino
                if(canonMaxExpressions[k])
                    canonMaxExpressions[k] += "(";
                else
                    canonMaxExpressions[k] = "(";
                for(var t in maxterms[k][j]){ // Para cada variable dentro del termino
                    switch(maxterms[k][j][t]){
                        case "0":
                            canonMaxExpressions[k] += inputs[t]+"+";                                
                            break;
                        case "1":
                            canonMaxExpressions[k] += inputs[t]+"'+";
                            break;                            
                        default:
                            break;
                    }
                }
                canonMaxExpressions[k] = canonMaxExpressions[k].substring(0,canonMaxExpressions[k].length-1);// Remover el ultimo "+"    
                canonMaxExpressions[k] += ") · ";
            }
            canonMaxExpressions[k] = canonMaxExpressions[k].substring(0,canonMaxExpressions[k].length-3);// Remover el ultimo "·"
        }
        

        // Generar expresiones para mostrar en vista de analisis
        for(var k in canonMinExpressions) 
            results.canonMinTerm[k] = "<b>" + outputs[k] + "</b>= " + canonMinExpressions[k];
        for(var k in canonMaxExpressions) 
            results.canonMaxTerm[k] = "<b>" + outputs[k] + "</b>= " + canonMaxExpressions[k];


        // Al terminar, mostrar resultados
        printResults(results);
    };

    var getPrimeImplicants = function (data) { // Obtener implicantes primos a partir de los miniterminos
        // Autor del metodo: Janus Troelsen (https://gist.github.com/ysangkok/5707171)
        /*
        var minterms = ['1101', '1100', '1110', '1111', '1010', '0011', '0111', '0110'];
        var minterms2 = ['0000', '0100', '1000', '0101', '1100', '0111', '1011', '1111'];
        var minterms3 = ['0001', '0011', '0100', '0110', '1011', '0000', '1000', '1010', '1100', '1101'];
        console.log( 'PI(s):', JSON.stringify(getPrimeImplicants(minterms)));
        console.log( 'PI2(s):', JSON.stringify(getPrimeImplicants(minterms2)));
        console.log( 'PI3(s):', JSON.stringify(getPrimeImplicants(minterms3)));
        */

        var combine = function (m, n) {
            var a = m.length,
                c = '',
                count = 0,
                i;
            for (i = 0; i < a; i++) {
                if (m[i] === n[i]) {
                    c += m[i];
                } else if (m[i] !== n[i]) {
                    c += '-';
                    count += 1;
                }
            }
            if (count > 1)
                return "";
            return c;
        };

        var repeatelem = function (elem, count) {
            var accu = [],
                addOneAndRecurse = function (remaining) {
                    accu.push(elem);
                    if (remaining > 1) {
                        addOneAndRecurse(remaining - 1);
                    }
                };
            addOneAndRecurse(count);
            return accu;
        };

        var newList = [].concat(data),
            size = newList.length,
            IM = [],
            im = [],
            im2 = [],
            mark = repeatelem(0, size),
            mark2, m = 0,
            i, j, c, p, n, r, q;
        for (i = 0; i < size; i++) {
            for (j = i + 1; j < size; j++) {
                c = combine(newList[i], newList[j]);
                if (c !== "") {
                    im.push(c);
                    mark[i] = 1;
                    mark[j] = 1;
                }
            }
        }

        mark2 = repeatelem(0, im.length);
        for (p = 0; p < im.length; p++) {
            for (n = p + 1; n < im.length; n++) {
                if (p !== n && mark2[n] === 0 && im[p] === im[n]) {
                    mark2[n] = 1;
                }
            }
        }

        for (r = 0; r < im.length; r++) {
            if (mark2[r] === 0) {
                im2.push(im[r]);
            }
        }

        for (q = 0; q < size; q++) {
            if (mark[q] === 0) {
                IM.push(newList[q]);
                m = m + 1;
            }
        }

        if (m !== size && size !== 1)
            IM = IM.concat(getPrimeImplicants(im2));

        IM.sort();
        return IM;
    };

    var getBooleanExpressions = function(){ // A partir de miniterminos y maxiterminos, devuelve las expresiones logicas

        for(var k in outputs){
            //if(minterms[k].length == 0){ // Si no hay miniterminos, la funcion es siempre nula
            if(!minterms[k]){              // Si no hay miniterminos, la funcion es siempre nula                    
                minifiedExpresions[k] = "0";
                continue; // Pasar a la siguiente salida
            }

            if(minterms[k].length == combMax){ // Si hay tantos miniterminos como combinaciones, la salida es siempre 1
                minifiedExpresions[k] = "1";
                continue; // Pasar a la siguiente salida
            }
            
            // Si ninguno de los casos anteriores se dio, obtener implicantes primos con el metodo QMC
            primeImplicants[k] = getPrimeImplicants(minterms[k]);
            for(var j in primeImplicants[k]){ // Para cada implicante                  
                for(var t in primeImplicants[k][j]){ // Para cada variable del implicante
                    switch(primeImplicants[k][j][t]){
                        case "1":
                            if(minifiedExpresions[k])
                                minifiedExpresions[k] += inputs[t];
                            else
                                minifiedExpresions[k] = inputs[t];
                            break;
                        case "0":
                            if(minifiedExpresions[k])
                                minifiedExpresions[k] += inputs[t]+"'";
                            else
                                minifiedExpresions[k] = inputs[t]+"'";
                            break;
                        case "-":
                            break;
                        default:
                            break;
                    }
                }
                minifiedExpresions[k] += " + ";
            }
            minifiedExpresions[k] = minifiedExpresions[k].substring(0,minifiedExpresions[k].length-3);// Remover el ultimo "+"
        }
        for(var k in minifiedExpresions) // Generar expresiones para mostrar en vista de analisis
            results.expressions[k] = "<b>" + outputs[k] + "</b>= " + minifiedExpresions[k];
        
        getCanonicalExpressions();
    };

    var evalInput = function(k){ // Evaluar entrada k-esima (en binario) (esta es una funcion recursiva)
        var inputBin = k.toString(2).padStart(inputs.length,"0"); // Convertir numero de combinacion a binario
        results.truthTable.rows[k] = { 
            inputs: inputBin.split(""), // Separar bits en arreglo
            outputs: [] // Completar salidas despues
        }
        for(var j in results.truthTable.rows[k].inputs) // Escribir entrada en el circuito del simulador
            simcir.setInputStatus(inputs[j], results.truthTable.rows[k].inputs[j] == "1");

        // Esperar un poco antes de leer la salida
        setTimeout(function(){
            // Leer cada una de las salidas de la simulacion
            for(var n in outputs){
                results.truthTable.rows[k].outputs[n] = simcir.getOutputStatus(outputs[n]) == 1 ? "1":"0";
                if(results.truthTable.rows[k].outputs[n] == "1"){ // Si la salida es H (alto), agregar minitermino
                    if(minterms[n])
                        minterms[n].push(inputBin);
                    else
                        minterms[n] = [inputBin];
                }else{
                    if(maxterms[n])
                        maxterms[n].push(inputBin);
                    else
                        maxterms[n] = [inputBin];
                }
            }
            k++; // Siguiente combinacion
            if(k < combMax) // Si quedan, pasar a la siguiente
                evalInput(k);
            else // Sino, pasar a calcular las funciones
                getBooleanExpressions();
        },50);    
    };

    evalInput(0); // Empezar por la primera
};

var printResults = function(results){
    
    if(DEBUG) console.log(results);

    // Generar tabla de verdad
    // Encabezado
    var header = document.getElementById("truthTableHeader");
    header.innerHTML = "<th>m</th>"; // Borrar
    for(var k in results.truthTable.header.inputs){
        var th = document.createElement("th");
        th.style = "background-color:rgb(214, 214, 214); min-width:25px";
        th.innerHTML = results.truthTable.header.inputs[k];
        header.appendChild(th);
    }
    for(var k in results.truthTable.header.outputs){
        var th = document.createElement("th");
        th.style = "background-color:rgb(163, 163, 163); min-width:25px";
        th.innerHTML = results.truthTable.header.outputs[k];
        header.appendChild(th);
    }
    // Cuerpo
    var body = document.getElementById("truthTableBody");
    body.innerHTML = "";
    for(var k in results.truthTable.rows){
        var tr = document.createElement("tr");
        tr.style = "padding: 1px 1px;";
        var td = document.createElement("td");
        td.style = "background-color:rgb(250, 250, 250)";
        td.innerHTML = parseInt(k);
        tr.appendChild(td);
        for(var j in results.truthTable.rows[k].inputs){
            var td = document.createElement("td");
            td.style = "background-color:rgb(214, 214, 214)";
            td.innerHTML = results.truthTable.rows[k].inputs[j];
            tr.appendChild(td);
        }
        for(var j in results.truthTable.rows[k].outputs){
            var td = document.createElement("td");
            td.style = "background-color:rgb(163, 163, 163)";
            td.innerHTML = results.truthTable.rows[k].outputs[j];
            tr.appendChild(td);
        }
        body.appendChild(tr);
    }

    // Detalles adicionales
    var details = document.getElementById("resultDetails")
    details.innerHTML = "";
    details.innerHTML += "<b>Componentes utilizados:</b> "+results.deviceCnt+"<br>";
    details.innerHTML += "<b>Conectores:</b>"+results.connectorCnt+"<br>";
    
    // Expresiones booleanas
    details.innerHTML += "<b>Expresiones minimizadas:</b>"+"<br>";
    var ul1 = document.createElement("ul");
    ul1.style = "margin-left: 20px";
    for(var k in results.expressions){
        var li = document.createElement("li");
        li.innerHTML = results.expressions[k];
        ul1.appendChild(li);
    }
    details.appendChild(ul1);
    
    details.innerHTML += "<b>Expresiones canónicas suma de productos:</b>"+"<br>";
    var ul2 = document.createElement("ul");
    ul2.style = "margin-left: 20px";
    for(var k in results.canonMinTerm){
        var li = document.createElement("li");
        li.innerHTML = results.canonMinTerm[k];
        ul2.appendChild(li);
    }
    details.appendChild(ul2);

    details.innerHTML += "<b>Expresiones canónicas producto de sumas:</b>"+"<br>";
    var ul3 = document.createElement("ul");
    ul3.style = "margin-left: 20px";
    for(var k in results.canonMaxTerm){
        var li = document.createElement("li");
        li.innerHTML = results.canonMaxTerm[k];
        ul3.appendChild(li);
    }
    details.appendChild(ul3);


    $("#results-modal").modal("show");
};


///// Inicializacion del controller

// Inicializar simulador

var queryStringModel = decodeURIComponent(window.location.search).replace("?model=", ""); 

if(queryStringModel){ // Si hay modelos en url
    var data = simpleCrypto.decrypt(queryStringModel); // Desifrar cadena
    if(DEBUG) console.log(data);
    if(data.length > 0){ // Verificacion simple
        var model = JSON.parse(data); // Obtener objeto desde string
        loadCircuit(model); // Cargar modelo
    }
}else{
    simcir.setupSimcir($('#simcir'), {
        width: document.getElementById("simcir").clientWidth,
        height: document.getElementById("simcir").clientHeight
    });
}

window.onresize = function(ev){ // Espacio responsivo
    // Dimensiones del card (que es responsive por bootstrap)
    var w = document.getElementById('simcir').clientWidth;
    var h = document.getElementById('simcir').clientHeight;
    var el = document.getElementsByClassName("simcir-workspace")[0]; // Div contenedor (generado por simcir)
    el.setAttribute("viewBox", "0 0 "+w+" "+h); // Dimensiones del svg
    el.setAttribute("width", w);
    el.setAttribute("height", h); 
};
