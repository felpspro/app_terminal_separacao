const axios = require("axios");
const readline = require("readline");
const fs = require("fs");
const path = require("path");
const { print, getPrinters } = require(process.platform === "win32" ? "pdf-to-printer":"unix-print");
/*  */
const rl = readline.createInterface({
    input: process.stdin, 
    output: process.stdout,
})
const ask = async(question) => {
    const result = await new Promise((resolve,reject) => {
        rl.question(question, (answer) => {
            resolve(answer)
        })
    })
    return result;
}

/* const fs = require("fs");
fs.readFile('file.pdf', function (err, data) {
    if (err) throw err;
    console.log(data);
}); */

const log = (message, { clean = false, type = ''} = {}) => {
    if(clean){
        console.clear()
    }
    if(type == 'separator'){
        console.log('----------------------------------------')
    }else{
        console.log(message)
    }
}

const awaitSys = async(time = 5000) => {
    const gg = await new Promise((resolve,reject) => {
        setTimeout(() => {
            resolve('ok')
        }, time)
    })
    return gg
}

class SeparacaoImpressao {
    constructor(){
        this.systemAPIToken = "";
        this.systemRunningIsWindows = process.platform === "win32"
        /*  */
        this.systemAPIAuth()
    }

    /* Save File */
    systemSaveFile = async(filePath, base64) => {
        fs.writeFile(`${filePath}`, base64, 'base64', error => {
            if (error) {
                throw error;
            } else {
                //console.log('base64 saved!');
            }
        });
    }

    /* Delete file */
    systemDeleteFile = () => {
        const directory = "./store/";
        fs.readdir(directory, (err, files) => {
            if (err) throw err;
            for (const file of files) {
                fs.unlink(path.join(directory, file), (err) => {
                if (err) throw err;
                });
            }
        });
    }

    /* Ask: Pegando numero da OE */
    askGetOe = async() => {
        return await ask('Digite o numero da OE e precione [ENTER]:  ')
    }

    /* Imprimindo */
    systemPrinter = async({ printerName = '' }) => {
        try {
            
            if(this.systemRunningIsWindows){
                return await print('./store/file.pdf', { printer:printerName })
                .then(data => true)
                .catch(err => false)
            }else{
                return await print('./store/file.pdf', printerName)
                .then(data => true)
                .catch(err => false)
            }
        } catch (error) {
            console.log(error)
            return null;
        }
    }

    /* Ask: Select printer */
    askSelectPrinter = async(printerList) => {
        const strPrinter = printerList.map((prin,i) => {
            return `${i+1} - ${prin.printer}`
        }).join('\n')
        return await ask(`Impressoras disponíveis: \n\n${strPrinter}\n\nSelecione o numero e precione [ENTER]: `)
    }

    systemAPIAuth = async() => {
        try {

            console.log('opa')
            const auth = await axios.post(`https://project-api-felps.my-apps.felps.cc/api/auth`, {}, {
                auth: {
                    username: "00000000000",
                    password: "!@#246810cp"
                }
            })
            .then(response => {
                this.systemAPIAuth = response.data.data.token;
                return true;
            })
            .catch(err => null);
            /*  */
            if(auth == null){
                throw new Error("\n-> Erro ao se autenticar, contate um administrador!\n")
            }
        } catch (error) {
            console.clear();
            console.log(error.message)
            process.exit(0)
        }
    }

    /* Get OE external */
    systemGetOE = async(oe = '') => {
        try {

            const getOE = await axios({
                method: "GET",
                url: `https://project-api-felps.my-apps.felps.cc/api/module/tracking/orderCapa/${oe}`,
                headers: { Authorization: `Bearer ${this.systemAPIAuth}` }
            })
            .then(res => {
                return {
                    error:false,
                    data: res.data.data.file
                }
            })
            .catch(err => {
                return {
                    error:true,
                    message: err.response?.data?.message
                }
            })
            return getOE;
        } catch (error) {
            console.log(error);
            return null;
        }
    }

    /* Iniciando app */
    startApp = async() => {
        try {

            console.clear()
            log("\n\n  Capa de pedido para a expedição/separação \n\n", { clean:false })
            /* Questão */
            const ask1 = await this.askGetOe()
            
            /* Buscando na api */
            log(`Buscando OE ${ask1}...`);
            await awaitSys(3000)

            /*  */
            const getOe = await this.systemGetOE(ask1)
            if(getOe.error){
                throw {
                    messageError: getOe.message
                }
            }
            const { data:fileData } = getOe;

            /*  */
            this.systemSaveFile('./store/file.pdf', fileData)
            
            /*  */
            const getList = await getPrinters();
            const ask2 = await this.askSelectPrinter(getList);
            /*  */
            const selectPrinter = getList[parseInt(ask2) - 1] || null;
            if(selectPrinter == null){
                throw {
                    messageError: "Selecione uma impressora valida"
                }
            }

            /* Imprimindo */
            const getResult = await this.systemPrinter({ printerName:selectPrinter.printer })
            if(getResult){
                log(`Capa do pedido OE-${ask1} enviada a impressão!`);
                await awaitSys(3000)
                this.startApp();
                this.systemDeleteFile()
            }else{
                log(`Erro ao imprimir OE-${ask1}. Aguarde..`);
                await awaitSys(3000)
                this.startApp();
                this.systemDeleteFile()
            }
            
        } catch (error) {
            console.log(error)
            //console.log('Opa', error)
        }
    }
}

const App = () => {
    try {

        const separar = new SeparacaoImpressao();
        /*  */
        separar.startApp()
        
    } catch (error) {
        console.log('err', error)
    }
}
App()