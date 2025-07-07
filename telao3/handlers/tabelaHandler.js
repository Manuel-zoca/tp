const fs = require('fs');
const path = require('path');

/**
 * Função que retorna a tabela de preços.
 */
const getTabelaPrecos = () => {
    return `> ⓘ *❗🛑MEGABYTE* *VODACOM*

*💡ESTAMOS DISPONÍVEIS DAS 6H ÀS 23:00*

*TABELA ATUALIZADA* 04/05/2025

🕓Validade: 1 dia
20MT    📶  1.100MB
30MT    📶  1.650MB
40MT    📶  2.200MB
50MT    📶  2.750MB 
60MT    📶  3.300MB
80MT    📶  4.400MB
100MT   📶  5.500MB
180MT   📶  10.000MB
280MT   📶  15.000MB
360MT   📶  20.000MB

🗓️SEMANAIS 7DIAS
105MT   📶  4.000MB 
130MT   📶  5.000MB 
150MT   📶  6.000MB 
250MT   📶  10.000MB 

🗓️MENSAL 30DIAS
150MT   📶    5.000MB
170MT    📶    7.200MB
210MT    📶    9.400MB
260MT    📶   10.500MB
520MT    📶   20.000MB
1150MT   📶   50.250MB

🚀 _Conectando pessoas,_
🚀 _compartilhando megabytes!_

📞 TUDO TOP VODACOM 

📍chamadas e SMS ilimitadas para todas redes

📆30 dias Tudo top

450MT 🔥 Chamadas + SMS ilimitadas + 9.5GB  +10min Int+30MB Roam
550MT 🔥 Chamadas + SMS ilimitadas + 12.5GB  +10min Int+30MB Roam
650MT 🔥 Chamadas + SMS ilimitadas + 15.5GB  +10min Int+30MB Roam
850MT 🔥 Chamadas + SMS ilimitadas + 27.5GB  +10min Int+30MB Roam
1050MT 🔥 Chamadas + SMS ilimitadas + 25.5GB  +10min Int+30MB Roam
`.trim();
};

/**
 * Função para lidar com os comandos de tabela.
 */
const handleTabela = async (sock, msg) => {
    const from = msg.key.remoteJid;
    const mensagem = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';

    try {
        console.log(`✅ Comando detectado no grupo ${from}`);

        const comando = mensagem.trim().toLowerCase();

        if (comando === '.n') {
            console.log(`📸 Enviando imagem solicitada pelo comando .n`);
            const imagePath = path.join(__dirname, '..', 'fotos', 'Netflix.jpeg');
            const imageBuffer = fs.readFileSync(imagePath);
            await sock.sendMessage(from, {
                image: imageBuffer,
                caption: '🎬 Promoção Netflix Ativada!',
            });
            console.log(`✅ Imagem enviada com sucesso.`);
            return;
        }

        if (comando === '.t') {
            console.log(`📸 Enviando imagem da tabela pelo comando .t`);
            const imagePath = path.join(__dirname, '..', 'fotos', 'tabela.jpg');
            const imageBuffer = fs.readFileSync(imagePath);
            await sock.sendMessage(from, {
                image: imageBuffer,
                caption: '📊 Tabela Completa de Preços Atualizada!',
            });
            console.log(`✅ Imagem da tabela enviada com sucesso.`);
            return;
        }

        if (comando === '.i') {
            console.log(`📸 Enviando imagem ilimitada pelo comando .i`);
            const imagePath = path.join(__dirname, '..', 'fotos', 'ilimitado.png');
            const imageBuffer = fs.readFileSync(imagePath);
            await sock.sendMessage(from, {
                image: imageBuffer,
                caption: '📶 Plano Ilimitado Ativado!',
            });
            console.log(`✅ Imagem ilimitada enviada com sucesso.`);
            return;
        }

        // Caso não seja um comando de imagem, envia a tabela
        const groupMetadata = await sock.groupMetadata(from).catch(() => null);
        if (!groupMetadata) {
            return sock.sendMessage(from, { text: '❌ Este comando só funciona em grupos!' });
        }

        const participants = groupMetadata.participants.map(p => p.id);
        const mensagemInicial = `📢 ATENÇÃO, MEMBROS DO GRUPO!`;

        await sock.sendMessage(from, {
            text: mensagemInicial,
            mentions: participants,
        });

        await new Promise(resolve => setTimeout(resolve, 4000));

        const tabelaPrecos = getTabelaPrecos();
        const maxCharsPerMessage = 1000;
        const partes = [];

        for (let i = 0; i < tabelaPrecos.length; i += maxCharsPerMessage) {
            partes.push(tabelaPrecos.substring(i, i + maxCharsPerMessage));
        }

        for (const parte of partes) {
            await sock.sendMessage(from, { text: parte });
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        console.log(`✅ Tabela de preços enviada em ${partes.length} parte(s).`);
    } catch (error) {
        console.error('🚨 Erro ao processar comando:', error);
        await sock.sendMessage(from, { text: '❌ Ocorreu um erro ao processar sua solicitação. Tente novamente mais tarde.' });
    }
};

module.exports = { handleTabela };
