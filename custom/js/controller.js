   
    var loadCircuit = function(model){ // Cargar circuito
        var data = JSON.parse(model);
        
        simcir.clearDevices(); // Borrar caches de managers

        // Poner barra de herramientas
        data.showToolbox = true;
        data.width = document.getElementById("simcir").clientWidth;
        data.height = document.getElementById("simcir").clientHeight
        data.toolbox = [
          {"type":"In"},
          {"type":"Out"},
          {"type":"Joint"},
          {"type":"DC"},
          {"type":"LED"},
          {"type":"PushOff"},
          {"type":"PushOn"},
          {"type":"Toggle"},
          {"type":"BUF"},
          {"type":"NOT"},
          {"type":"AND"},
          {"type":"NAND"},
          {"type":"OR"},
          {"type":"NOR"},
          {"type":"XOR"},
          {"type":"XNOR"},
          {"type":"OSC"},
          {"type":"7seg"},
          {"type":"16seg"},
          {"type":"4bit7seg"},
          {"type":"RotaryEncoder"},
          {"type":"BusIn"},
          {"type":"BusOut"},
          {"type":"RS-FF"},
          {"type":"JK-FF"},
          {"type":"T-FF"},
          {"type":"D-FF"},
          {"type":"8bitCounter"},
          {"type":"HalfAdder"},
          {"type":"FullAdder"},
          {"type":"4bitAdder"},
          {"type":"2to4BinaryDecoder"},
          {"type":"3to8BinaryDecoder"},
          {"type":"4to16BinaryDecoder"},
          {"type":"Virtual-In"},
          {"type":"Virtual-Out"},
          {"type":"Test-In"},
          {"type":"Test-Out"},
          {"type":"Audio-Out"}
        ];
        simcir.setupSimcir($('#simcir'), data);
    };

    var saveCircuit = function () {
        var model = simcir.controller($('#simcir').find('.simcir-workspace')).data(); // Objeto con datos de simulacion
        //var data = JSON.stringify((({ devices, connectors }) => ({ devices, connectors }))(model)); // Solo guardar dos propiedades
        var data = JSON.stringify((function(model){return {devices:model.devices, connectors:model.connectors};})(model));  // Solo guardar dos propiedades

        if(model.devices.length == 0){ // No guardar si no hay componentes
            toastr.error("No hay componentes!");
            $rootScope.loading = false;
        }else{ // Si hay al menos un componente, guardar en db
            
            var sim = { // Objeto a encriptar
                timestamp: Date.now(),
                size: model.devices.length,
                data: data
            };

            console.log(sim);
        }
    };


    analizeCircuit = function(){ // Analisis combinacional del circuito
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
        var circuitDetails = {
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
                circuitDetails.canonMinTerm[k] = "<b>" + outputs[k] + "</b>= " + canonMinExpressions[k];
            for(var k in canonMaxExpressions) 
                circuitDetails.canonMaxTerm[k] = "<b>" + outputs[k] + "</b>= " + canonMaxExpressions[k];
            
            // Para terminar, ocultar el preloader y mostrar el modal con resultados
            $rootScope.loading = false;
            results_modal.open();
            $apply();
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
                primeImplicants[k] = Cipressus.utils.getPrimeImplicants(minterms[k]);
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
            //console.log(circuitDetails);
            for(var k in minifiedExpresions) // Generar expresiones para mostrar en vista de analisis
                circuitDetails.expressions[k] = "<b>" + outputs[k] + "</b>= " + minifiedExpresions[k];
            
            getCanonicalExpressions();
        };
  
        var evalInput = function(k){ // Evaluar entrada k-esima (en binario) (esta es una funcion recursiva)
            var inputBin = k.toString(2).padStart(inputs.length,"0"); // Convertir numero de combinacion a binario
            circuitDetails.truthTable.rows[k] = { 
                inputs: inputBin.split(""), // Separar bits en arreglo
                outputs: [] // Completar salidas despues
            }
            for(var j in circuitDetails.truthTable.rows[k].inputs) // Escribir entrada en el circuito del simulador
                simcir.setInputStatus(inputs[j], circuitDetails.truthTable.rows[k].inputs[j] == "1");

            // Esperar un poco antes de leer la salida
            setTimeout(function(){
                // Leer cada una de las salidas de la simulacion
                for(var n in outputs){
                    circuitDetails.truthTable.rows[k].outputs[n] = simcir.getOutputStatus(outputs[n]) == 1 ? "1":"0";
                    if(circuitDetails.truthTable.rows[k].outputs[n] == "1"){ // Si la salida es H (alto), agregar minitermino
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



    ///// Inicializacion del controller
    var currentSim = {}; // Datos de la simulacion actual (se crean al abrir o guardar nuevo)
    
    // Inicializar simulador
    var openSimulation = false;
    if(openSimulation){ // Si hay modelos en url
        loadCircuit(openSimulation);
    }else{
        simcir.setupSimcir($('#simcir'), {
            width: document.getElementById("simcir").clientWidth,
            height: document.getElementById("simcir").clientHeight
        });
    }

    window.onresize = function(ev){ // Simulador responsive
        // Dimensiones del card (que es responsive)
        var w = document.getElementById('simcir').clientWidth;
        var h = document.getElementById('simcir').clientHeight;
        //console.log(h,w);
        var el = document.getElementsByClassName("simcir-workspace")[0]; // Div contenedor (generado por simcir)
        el.setAttribute("viewBox", "0 0 "+w+" "+h); // Dimensiones del svg
        el.setAttribute("width", w); // Escala
        el.setAttribute("height", h); 
    };