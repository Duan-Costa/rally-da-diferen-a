(function(){
  "use strict";

  var bancoLocalPromise = null;
  function abrirBancoLocal(){
    if(!window.indexedDB) return Promise.reject(new Error("Armazenamento local indisponível."));
    if(bancoLocalPromise) return bancoLocalPromise;
    bancoLocalPromise = new Promise(function(resolve, reject){
      var pedido = window.indexedDB.open("rally-diferenca-local", 1);
      pedido.onupgradeneeded = function(){
        if(!pedido.result.objectStoreNames.contains("uploads")){
          pedido.result.createObjectStore("uploads", {keyPath:"id", autoIncrement:true});
        }
      };
      pedido.onsuccess = function(){ resolve(pedido.result); };
      pedido.onerror = function(){ reject(pedido.error || new Error("Não consegui abrir o armazenamento local.")); };
    });
    return bancoLocalPromise;
  }

  function listarUploads(tipo, projeto){
    return abrirBancoLocal().then(function(db){
      return new Promise(function(resolve, reject){
        var transacao = db.transaction("uploads", "readonly");
        var pedido = transacao.objectStore("uploads").getAll();
        pedido.onsuccess = function(){
          var itens = pedido.result.filter(function(item){
            return item.tipo === tipo && (!projeto || item.projeto === projeto);
          }).map(function(item){ return Object.assign(item, {localId:item.id}); });
          itens.sort(function(a, b){ return (b.ts || 0) - (a.ts || 0); });
          resolve(itens);
        };
        pedido.onerror = function(){ reject(pedido.error); };
        transacao.onerror = function(){ reject(transacao.error); };
      });
    });
  }

  function salvarUpload(tipo, dados){
    return abrirBancoLocal().then(function(db){
      return new Promise(function(resolve, reject){
        var transacao = db.transaction("uploads", "readwrite");
        var registro = Object.assign({tipo:tipo, ts:Date.now()}, dados);
        var pedido = transacao.objectStore("uploads").add(registro);
        pedido.onsuccess = function(){ registro.localId = pedido.result; };
        transacao.oncomplete = function(){ resolve(registro); };
        transacao.onerror = function(){ reject(transacao.error || new Error("Não consegui salvar o arquivo.")); };
        transacao.onabort = function(){ reject(transacao.error || new Error("O salvamento foi cancelado.")); };
      });
    });
  }

  function excluirUpload(id){
    return abrirBancoLocal().then(function(db){
      return new Promise(function(resolve, reject){
        var transacao = db.transaction("uploads", "readwrite");
        transacao.objectStore("uploads").delete(Number(id));
        transacao.oncomplete = resolve;
        transacao.onerror = function(){ reject(transacao.error); };
      });
    });
  }

  function atualizarUpload(id, alteracoes){
    return abrirBancoLocal().then(function(db){
      return new Promise(function(resolve, reject){
        var transacao = db.transaction("uploads", "readwrite");
        var loja = transacao.objectStore("uploads");
        var pedido = loja.get(Number(id));
        pedido.onsuccess = function(){
          if(!pedido.result){ reject(new Error("Cadastro não encontrado.")); return; }
          loja.put(Object.assign(pedido.result, alteracoes));
        };
        pedido.onerror = function(){ reject(pedido.error); };
        transacao.oncomplete = resolve;
        transacao.onerror = function(){ reject(transacao.error); };
      });
    });
  }

  function urlDoUpload(item){
    if(item.src) return item.src;
    if(item.blob){
      if(!item.objectUrl) item.objectUrl = URL.createObjectURL(item.blob);
      return item.objectUrl;
    }
    return item.assetId ? "/_blob/" + item.assetId : "";
  }

  /* ---- frase animada ---- */
  var frase = "QUAL TRIBO VAI SER CAMPEÃ?";
  var alvo = document.getElementById("frase");
  var reduz = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if(reduz){ alvo.textContent = frase; }
  else{
    var i = 0;
    var cur = document.createElement("span");
    cur.className = "cursor"; cur.textContent = "|";
    alvo.appendChild(cur);
    (function escreve(){
      if(i < frase.length){
        cur.insertAdjacentText("beforebegin", frase[i]);
        i++; setTimeout(escreve, 70);
      } else { setTimeout(function(){ cur.remove(); }, 1600); }
    })();
  }

  /* ---- fundo do hero trocando a cada 5s ---- */
  var fundos = document.querySelectorAll(".hero-bg-img");
  if(fundos.length > 1){
    var fundoAtivo = 0;
    setInterval(function(){
      fundos[fundoAtivo].classList.remove("ativo");
      fundoAtivo = (fundoAtivo + 1) % fundos.length;
      fundos[fundoAtivo].classList.add("ativo");
    }, 5000);
  }

  /* ---- tilt 3D ao passar o mouse ---- */
  var tiltAtivo = !reduz && window.matchMedia("(hover: hover)").matches;
  function ativarTilt(el){
    if(!tiltAtivo) return;
    var max = parseFloat(el.getAttribute("data-tilt")) || 12;
    var box = null;
    el.addEventListener("pointerenter", function(){ box = el.getBoundingClientRect(); });
    el.addEventListener("pointermove", function(e){
      if(!box) box = el.getBoundingClientRect();
      var px = (e.clientX - box.left) / box.width;
      var py = (e.clientY - box.top) / box.height;
      px = Math.min(1, Math.max(0, px));
      py = Math.min(1, Math.max(0, py));
      var rx = (0.5 - py) * max;
      var ry = (px - 0.5) * max;
      el.style.transform = "perspective(900px) rotateX(" + rx.toFixed(2) + "deg) rotateY(" + ry.toFixed(2) + "deg) scale3d(1.04,1.04,1.04)";
      el.style.setProperty("--mx", (px * 100).toFixed(1) + "%");
      el.style.setProperty("--my", (py * 100).toFixed(1) + "%");
    });
    el.addEventListener("pointerleave", function(){
      el.style.transform = "perspective(900px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)";
      el.style.removeProperty("--mx");
      el.style.removeProperty("--my");
    });
  }
  document.querySelectorAll(".tilt").forEach(ativarTilt);

  /* ---- dados ---- */
  var PROVAS = [
    {nome:"Prova bíblica", j:120, l:140},
    {nome:"Convite (Jovens novos ou afastados)", j:180, l:150},
    {nome:"Pessoas no Algo A+", j:0, l:0},
    {nome:"Pessoas no Encontro Jovem (FJU)", j:0, l:0},
    {nome:"Gincana dos projetos", j:130, l:160},
    {nome:"Presença do mês", j:90, l:110},
    {nome:"Pessoas na reunião de domingo", j:0, l:0}
  ];
  var presencaAuto = {j:0, l:0};
  var PROJETOS = [
    {n:"Atalaia", c:"#C8102E", p:160, img:"imagens/projeto-atalaia.png", fotos:fotosLocais("projetos/atalaia", 1, "Atalaia · Foto"),
     m:"Os voluntários recepcionam e acompanham de perto quem está chegando pela primeira vez, garantindo que ninguém se sinta sozinho."},
    {n:"Esportes", c:"#22A45D", p:180, img:"imagens/projeto-esportes.png", fotos:fotosLocais("projetos/esportes", 1, "Esportes · Foto"),
     m:"Promove a prática de atividades físicas, torneios e integração entre os participantes."},
    {n:"Arcanjos", c:"#3B9AD9", p:150, img:"imagens/projeto-arcanjos.png", fotos:fotosLocais("projetos/arcanjos", 1, "Arcanjos · Foto"),
     m:"Vai em busca de quem um dia teve uma ligação com a fé e se desviou dos caminhos espirituais, e também fortalece quem continua ativo mas atravessa momentos de desânimo."},
    {n:"Cultura", c:"#F2A81D", p:145, img:"imagens/projeto-cultura.png", fotos:fotosLocais("projetos/cultura", 1, "Cultura · Foto"),
     m:"Incentiva talentos em dança, teatro, canto e música, unindo a arte com a fé."},
    {n:"Mídia", c:"#1D5FA8", p:125, img:"imagens/projeto-midia.png", fotos:fotosLocais("projetos/midia", 1, "Mídia · Foto"),
     m:"Capacita jovens em fotografia, design gráfico, produção de vídeo e redes sociais."},
    {n:"Help", c:"#D9B310", p:135, img:"imagens/projeto-help.png", fotos:fotosLocais("projetos/help", 1, "Help · Foto"),
     m:"Oferece escuta e apoio emocional para jovens que enfrentam depressão, ansiedade, automutilação ou pensamentos suicidas."}
  ];
  var CHAVE = "rally-fju-placar-v1";

  /* ---- persistência ---- */
  function carregar(){
    try{
      var bruto = localStorage.getItem(CHAVE);
      if(!bruto) return null;
      var dados = JSON.parse(bruto);
      if(!Array.isArray(dados) || dados.length !== PROVAS.length) return null;
      return dados;
    }catch(e){ return null; }
  }
  function salvar(){
    try{
      localStorage.setItem(CHAVE, JSON.stringify(PROVAS.map(function(p){ return {j:p.j, l:p.l}; })));
    }catch(e){ /* navegador sem storage: segue só em memória */ }
  }
  var salvos = carregar();
  if(salvos){ salvos.forEach(function(d,k){ PROVAS[k].j = d.j; PROVAS[k].l = d.l; }); }

  /* ---- placar ---- */
  var editando = false;
  var corpo = document.getElementById("corpo-tabela");

  function desenhaTabela(){
    corpo.innerHTML = "";
    PROVAS.forEach(function(p, k){
      var tr = document.createElement("tr");
      var td0 = document.createElement("td");
      if(p.img){
        var logo = document.createElement("img");
        logo.src = p.img; logo.alt = p.nome; logo.className = "prova-logo";
        td0.appendChild(logo);
      } else {
        td0.textContent = p.nome;
      }
      tr.appendChild(td0);
      ["j","l"].forEach(function(lado){
        var td = document.createElement("td");
        td.className = "num " + lado;
        if(editando){
          var inp = document.createElement("input");
          inp.type = "number"; inp.min = "0"; inp.className = "entrada";
          inp.value = p[lado];
          inp.setAttribute("aria-label", p.nome + " – " + (lado === "j" ? "Judá" : "Levi"));
          inp.addEventListener("input", function(){
            var v = parseInt(inp.value, 10);
            PROVAS[k][lado] = isNaN(v) || v < 0 ? 0 : v;
            atualiza(); salvar();
          });
          td.appendChild(inp);
        } else {
          td.textContent = p[lado];
        }
        tr.appendChild(td);
      });
      corpo.appendChild(tr);
    });

    var trAuto = document.createElement("tr");
    trAuto.className = "linha-auto";
    var tdAutoNome = document.createElement("td");
    tdAutoNome.innerHTML = 'Presença dos jovens <span class="prova-auto">(automático)</span>';
    trAuto.appendChild(tdAutoNome);
    ["j","l"].forEach(function(lado){
      var td = document.createElement("td");
      td.className = "num " + lado;
      td.textContent = presencaAuto[lado];
      trAuto.appendChild(td);
    });
    corpo.appendChild(trAuto);
  }

  function anima(el, destino){
    var inicio = parseInt(el.textContent, 10) || 0;
    if(reduz || inicio === destino){ el.textContent = destino; return; }
    var t0 = performance.now(), dur = 700;
    (function passo(t){
      var k = Math.min(1, (t - t0) / dur);
      el.textContent = Math.round(inicio + (destino - inicio) * (1 - Math.pow(1 - k, 3)));
      if(k < 1) requestAnimationFrame(passo);
    })(t0);
  }

  var liderAnterior = null;
  var primeiraAtualizacao = true;

  function dispararConfete(tribo){
    if(reduz || typeof confetti !== "function") return;
    var cores = tribo === "juda" ? ["#159B5F","#3FD98D","#E0B44A"] : ["#B4155C","#FF5D9E","#E0B44A"];
    var duracao = 1800;
    var fim = Date.now() + duracao;
    (function tiro(){
      confetti({particleCount:4,angle:60,spread:70,origin:{x:0,y:0.65},colors:cores});
      confetti({particleCount:4,angle:120,spread:70,origin:{x:1,y:0.65},colors:cores});
      if(Date.now() < fim) requestAnimationFrame(tiro);
    })();
    confetti({particleCount:120,spread:100,origin:{y:0.55},colors:cores,startVelocity:45});
  }

  function atualiza(){
    var tj = PROVAS.reduce(function(s,p){ return s + p.j; }, 0) + presencaAuto.j;
    var tl = PROVAS.reduce(function(s,p){ return s + p.l; }, 0) + presencaAuto.l;
    anima(document.getElementById("pt-juda"), tj);
    anima(document.getElementById("pt-levi"), tl);
    document.getElementById("tot-j").textContent = tj;
    document.getElementById("tot-l").textContent = tl;
    var soma = tj + tl;
    var pj = soma ? Math.round(tj / soma * 100) : 50;
    document.getElementById("barra-j").style.width = pj + "%";
    document.getElementById("barra-l").style.width = (100 - pj) + "%";
    document.getElementById("pct-j").textContent = "Judá " + pj + "%";
    document.getElementById("pct-l").textContent = (100 - pj) + "% Levi";
    var lider = document.getElementById("lider");
    lider.textContent = tj === tl ? "empate técnico"
      : (tj > tl ? "Judá na frente por " + (tj - tl) : "Levi na frente por " + (tl - tj));

    var liderAtual = tj === tl ? null : (tj > tl ? "juda" : "levi");
    if(!primeiraAtualizacao && liderAtual && liderAtual !== liderAnterior){
      dispararConfete(liderAtual);
    }
    liderAnterior = liderAtual;
    primeiraAtualizacao = false;
  }

  document.getElementById("btn-editar").addEventListener("click", function(){
    editando = !editando;
    this.textContent = editando ? "Fechar modo organizador" : "Abrir modo organizador";
    document.getElementById("aviso-placar").textContent = editando
      ? "Digite os pontos de cada prova. Salva sozinho neste aparelho."
      : "Os pontos ficam salvos só neste aparelho, no navegador.";
    desenhaTabela();
  });

  document.getElementById("btn-zerar").addEventListener("click", function(){
    PROVAS.forEach(function(p){ p.j = 0; p.l = 0; });
    salvar(); desenhaTabela(); atualiza();
  });

  desenhaTabela();
  atualiza();

  /* ---- cadastro de jovens e presença automática ---- */
  var elFormJovem = document.getElementById("form-jovem");
  var elNomeJovem = document.getElementById("input-nome-jovem");
  var elTriboJovem = document.getElementById("input-tribo-jovem");
  var elWhatsJovem = document.getElementById("input-whats-jovem");
  var elStatusJovem = document.getElementById("status-jovem");
  var elBtnCadastrarJovem = document.getElementById("btn-cadastrar-jovem");
  var elListaJovens = document.getElementById("lista-jovens");
  var elJovensVazio = document.getElementById("jovens-vazio");
  var elBuscarJovem = document.getElementById("input-buscar-jovem");

  var JOVENS = [];
  var PRESENCAS_SEMANA = {};
  var filtroJovem = "";
  var DIAS_PRESENCA = [
    {chave:"quarta", rotulo:"Quarta"},
    {chave:"sexta", rotulo:"Sexta"},
    {chave:"sabado", rotulo:"Sábado"},
    {chave:"domingo", rotulo:"Domingo"}
  ];

  function semanaAtual(){
    var d = new Date();
    var umJan = new Date(d.getFullYear(), 0, 1);
    var dias = Math.floor((d - umJan) / 86400000);
    var semana = Math.ceil((dias + umJan.getDay() + 1) / 7);
    return d.getFullYear() + "-S" + semana;
  }

  function desenharJovens(){
    elListaJovens.innerHTML = "";
    var termo = filtroJovem.trim().toLowerCase();
    var filtrados = termo ? JOVENS.filter(function(j){ return (j.nome || "").toLowerCase().indexOf(termo) !== -1; }) : JOVENS;

    if(!JOVENS.length){
      elJovensVazio.textContent = "Nenhum jovem cadastrado ainda.";
      elListaJovens.appendChild(elJovensVazio);
      return;
    }
    if(!filtrados.length){
      elJovensVazio.textContent = "Ninguém encontrado com esse nome.";
      elListaJovens.appendChild(elJovensVazio);
      return;
    }

    filtrados.forEach(function(j){
      var linha = document.createElement("div"); linha.className = "jovem-linha";
      var topo = document.createElement("div"); topo.className = "jovem-topo";
      var nome = document.createElement("span"); nome.className = "jovem-nome"; nome.textContent = j.nome;
      var tribo = document.createElement("span");
      tribo.className = "jovem-tribo " + j.tribo;
      tribo.textContent = j.tribo === "juda" ? "Judá" : "Levi";
      var editarNome = document.createElement("button");
      editarNome.type = "button"; editarNome.className = "jovem-editar";
      editarNome.textContent = "Editar nome";
      editarNome.addEventListener("click", function(){
        var novoNome = window.prompt("Editar nome do jovem:", j.nome || "");
        if(novoNome === null) return;
        novoNome = novoNome.trim().slice(0, 60);
        if(!novoNome || novoNome === j.nome) return;
        editarNome.disabled = true;
        var atualizar;
        if(j.localId || !CAP.db){
          atualizar = atualizarUpload(j.localId || j.id, {nome:novoNome});
        } else {
          atualizar = CAP.db.collection("rally_jovens").doc(j.id).update({nome:novoNome});
        }
        atualizar.then(function(){
          j.nome = novoNome;
          desenharJovens();
        }).catch(function(){
          editarNome.disabled = false;
          window.alert("Não consegui atualizar esse nome agora.");
        });
      });
      var excluirCadastro = document.createElement("button");
      excluirCadastro.type = "button"; excluirCadastro.className = "jovem-excluir";
      excluirCadastro.textContent = "Excluir";
      excluirCadastro.setAttribute("aria-label", "Excluir cadastro de " + (j.nome || "jovem"));
      excluirCadastro.addEventListener("click", function(){
        if(!window.confirm("Excluir o cadastro de " + (j.nome || "este jovem") + "? Essa ação não pode ser desfeita.")) return;
        editarNome.disabled = true;
        excluirCadastro.disabled = true;
        var remover;
        if(j.localId || !CAP.db){
          remover = excluirUpload(j.localId || j.id);
        } else {
          remover = CAP.db.collection("rally_presencas").where("pessoaId", "==", j.id).get().then(function(snap){
            var exclusoes = snap.docs.map(function(doc){ return doc.ref.delete(); });
            exclusoes.push(CAP.db.collection("rally_jovens").doc(j.id).delete());
            return Promise.all(exclusoes);
          });
        }
        remover.then(function(){
          JOVENS = JOVENS.filter(function(item){ return item.id !== j.id; });
          delete PRESENCAS_SEMANA[j.id];
          desenharJovens();
        }).catch(function(){
          editarNome.disabled = false;
          excluirCadastro.disabled = false;
          window.alert("Não consegui excluir esse cadastro agora.");
        });
      });
      var acoes = document.createElement("div"); acoes.className = "jovem-acoes";
      acoes.appendChild(editarNome); acoes.appendChild(excluirCadastro);
      topo.appendChild(nome); topo.appendChild(acoes); topo.appendChild(tribo);

      var dias = document.createElement("div"); dias.className = "jovem-dias";
      var marcadosDaPessoa = PRESENCAS_SEMANA[j.id] || {};

      DIAS_PRESENCA.forEach(function(d){
        var btn = document.createElement("button");
        btn.type = "button"; btn.className = "btn-dia";
        var jaMarcou = !!marcadosDaPessoa[d.chave];
        btn.textContent = (jaMarcou ? "✓ " : "") + d.rotulo;
        btn.disabled = jaMarcou;
        btn.addEventListener("click", function(){
          if(!CAP.db) return;
          btn.disabled = true; btn.textContent = "...";
          CAP.db.collection("rally_presencas").add({
            pessoaId: j.id, nome: j.nome, tribo: j.tribo,
            dia: d.chave, semana: semanaAtual(), ts: Date.now()
          }).then(function(){
            btn.textContent = "✓ " + d.rotulo;
          }).catch(function(){
            btn.disabled = false; btn.textContent = d.rotulo;
          });
        });
        dias.appendChild(btn);
      });

      linha.appendChild(topo); linha.appendChild(dias);
      elListaJovens.appendChild(linha);
    });
  }

  function ligarJovens(){
    if(!CAP.db){
      listarUploads("jovem").then(function(locais){
        JOVENS = locais.map(function(j){ return {id:j.localId,nome:j.nome,tribo:j.tribo,whatsapp:j.whatsapp}; });
        desenharJovens();
      }).catch(function(){
        elJovensVazio.textContent = "Não consegui carregar os cadastros neste navegador.";
        elListaJovens.innerHTML = "";
        elListaJovens.appendChild(elJovensVazio);
      });
      return;
    }
    try{
      armarAvisoDemorado(elJovensVazio);
      CAP.db.collection("rally_jovens").orderBy("nome", "asc").limit(500).onSnapshot(function(snap){
        JOVENS = snap.docs.map(function(doc){ var d = doc.data(); return Object.assign({id: doc.id}, d); });
        desenharJovens();
      }, function(){
        elJovensVazio.textContent = "Não consegui carregar os cadastros agora.";
      });
    }catch(e){
      elJovensVazio.textContent = "Não consegui carregar os cadastros agora.";
    }
  }

  function ligarPresencas(){
    if(!CAP.db) return;
    try{
      var semana = semanaAtual();
      CAP.db.collection("rally_presencas").limit(5000).onSnapshot(function(snap){
        var tj = 0, tl = 0, marcados = {};
        snap.docs.forEach(function(doc){
          var d = doc.data();
          if(d.tribo === "juda") tj += 10; else if(d.tribo === "levi") tl += 10;
          if(d.semana === semana){
            marcados[d.pessoaId] = marcados[d.pessoaId] || {};
            marcados[d.pessoaId][d.dia] = true;
          }
        });
        presencaAuto.j = tj; presencaAuto.l = tl;
        PRESENCAS_SEMANA = marcados;
        desenhaTabela(); atualiza(); desenharJovens();
      });
    }catch(e){ /* segue sem presença automática */ }
  }

  elBuscarJovem.addEventListener("input", function(){
    filtroJovem = elBuscarJovem.value;
    desenharJovens();
  });

  function prepararCadastroJovem(){
    if(!CAP.db){
      elFormJovem.removeAttribute("data-sem-envio");
      elStatusJovem.textContent = "O cadastro fica salvo neste navegador e pode ser enviado pelo WhatsApp.";
    }
  }

  elFormJovem.addEventListener("submit", function(e){
    e.preventDefault();
    var nome = elNomeJovem.value.trim().slice(0, 60);
    var tribo = elTriboJovem.value;
    var whats = elWhatsJovem.value.trim().slice(0, 20);
    var diasPreferidos = Array.prototype.map.call(
      elFormJovem.querySelectorAll('input[name="dias-preferencia"]:checked'),
      function(input){
        var dia = DIAS_PRESENCA.find(function(item){ return item.chave === input.value; });
        return dia ? dia.rotulo : "";
      }
    ).filter(Boolean);
    if(!nome || !tribo || !whats) return;

    var nomeTribo = tribo === "juda" ? "Judá" : "Levi";
    var textoDias = diasPreferidos.length ? diasPreferidos.join(", ") : "Não informado";
    var mensagem = "Novo cadastro - Rally Diferença\nNome: " + nome + "\nTribo: " + nomeTribo + "\nWhatsApp: " + whats + "\nDias que costuma participar: " + textoDias;
    var linkWhatsApp = "https://wa.me/5516981183560?text=" + encodeURIComponent(mensagem);

    elBtnCadastrarJovem.disabled = true;
    elStatusJovem.className = "form-status";
    elStatusJovem.textContent = "Cadastrando...";

    var salvarCadastro;
    if(CAP.db){
      salvarCadastro = CAP.db.collection("rally_jovens").add({nome:nome,tribo:tribo,whatsapp:whats,diasPreferidos:diasPreferidos,ts:Date.now()});
    } else {
      salvarCadastro = salvarUpload("jovem", {nome:nome,tribo:tribo,whatsapp:whats,diasPreferidos:diasPreferidos}).then(function(registro){
        JOVENS.push({id:registro.localId,nome:nome,tribo:tribo,whatsapp:whats,diasPreferidos:diasPreferidos});
        desenharJovens();
      });
    }

    salvarCadastro.then(function(){
      elStatusJovem.className = "form-status ok";
      elStatusJovem.textContent = "Cadastro salvo. Toque abaixo para enviar os dados pelo WhatsApp.";
      var link = document.createElement("a");
      link.className = "btn solido enviar-whatsapp";
      link.href = linkWhatsApp; link.target = "_blank"; link.rel = "noopener noreferrer";
      link.textContent = "Enviar pelo WhatsApp";
      elStatusJovem.appendChild(link);
      elFormJovem.reset();
    }).catch(function(){
      elStatusJovem.className = "form-status erro";
      elStatusJovem.textContent = "Não deu pra cadastrar agora. Tenta de novo.";
    }).finally(function(){
      elBtnCadastrarJovem.disabled = false;
    });
  });

  /* ---- projetos ---- */
  var lista = document.getElementById("lista-projetos");
  var PROJ_POR_CHAVE = {};
  var editandoProj = false;
  var CHAVE_PROJ = "rally-fju-projetos-v1";
  function chaveDe(nome){ return nome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }

  function carregarProjetos(){
    try{
      var bruto = localStorage.getItem(CHAVE_PROJ);
      if(!bruto) return null;
      var dados = JSON.parse(bruto);
      if(!Array.isArray(dados) || dados.length !== PROJETOS.length) return null;
      return dados;
    }catch(e){ return null; }
  }
  function salvarProjetos(){
    try{ localStorage.setItem(CHAVE_PROJ, JSON.stringify(PROJETOS.map(function(p){ return p.p; }))); }
    catch(e){ /* segue só em memória */ }
  }
  var pontosSalvos = carregarProjetos();
  if(pontosSalvos){ PROJETOS.forEach(function(p, k){ p.p = pontosSalvos[k]; }); }
  PROJETOS.forEach(function(p){ PROJ_POR_CHAVE[chaveDe(p.n)] = p; });

  function fotosLocais(pasta, quantidade, titulo){
    var fotos = [];
    for(var i = 1; i <= quantidade; i++){
      var numero = String(i).padStart(2, "0");
      fotos.push({nome: titulo + " " + numero, src: "imagens/" + pasta + "/" + numero + ".jpeg"});
    }
    return fotos;
  }

  /* eventos (Algo A+ e Encontro Jovem) entram no mesmo registro pra abrir a galeria */
  var EVENTOS = [
    {n:"Reunião do Algo A+", c:"#E0A93A", img:"imagens/encontro-algo-a-mais.png",
     m:"Toda segunda-feira às 19h. É ideal para quem já participa das atividades da igreja ou da FJU e deseja ir além na vida com Deus, embora também seja aberto a novos participantes.",
    fotos:fotosLocais("algoa-mais", 12, "Algo A+ · Foto")},
    {n:"Encontro Jovem (FJU)", c:"#3B6FD9", img:"imagens/encontro-jovem.png",
     m:"Todo sábado às 15h. Um espaço voltado para receber jovens, oferecer suporte emocional e espiritual, e ajudar quem passa por problemas ou busca orientações.",
     fotos:fotosLocais("encontro-jovem", 17, "Encontro Jovem · Foto")}
  ];
  EVENTOS.forEach(function(e){ PROJ_POR_CHAVE[chaveDe(e.n)] = e; });

  document.querySelectorAll(".explica-foto").forEach(function(fig, i){
    var chave = chaveDe(EVENTOS[i].n);
    fig.setAttribute("role", "button");
    fig.setAttribute("tabindex", "0");
    fig.setAttribute("aria-haspopup", "dialog");
    fig.style.cursor = "pointer";
    fig.addEventListener("click", function(){ abrirModal(chave); });
    fig.addEventListener("keydown", function(ev){
      if(ev.key === "Enter" || ev.key === " "){ ev.preventDefault(); abrirModal(chave); }
    });
  });

  function desenhaProjetos(){
    lista.innerHTML = "";
    lista.classList.toggle("editando", editandoProj);
    PROJETOS.forEach(function(p){
      var chave = chaveDe(p.n);

      var art = document.createElement("article");
      art.className = "proj tilt";
      art.setAttribute("data-tilt", "5");
      art.style.setProperty("--cor", p.c);

      var img = document.createElement("img");
      img.className = "proj-logo"; img.src = p.img; img.alt = "Emblema do projeto " + p.n; img.loading = "lazy";

      var conteudo = document.createElement("div"); conteudo.className = "proj-conteudo";
      var h = document.createElement("h4"); h.textContent = p.n;
      var m = document.createElement("p"); m.className = "missao"; m.textContent = p.m;
      var meta = document.createElement("p"); meta.className = "meta";

      if(editandoProj){
        var inp = document.createElement("input");
        inp.type = "number"; inp.min = "0"; inp.className = "entrada";
        inp.value = p.p;
        inp.setAttribute("aria-label", "Pontos de " + p.n);
        inp.addEventListener("click", function(e){ e.stopPropagation(); });
        inp.addEventListener("input", function(){
          var v = parseInt(inp.value, 10);
          p.p = isNaN(v) || v < 0 ? 0 : v;
          salvarProjetos();
        });
        meta.appendChild(inp);
        var s1 = document.createElement("span"); s1.textContent = "pontos";
        meta.appendChild(s1);
      } else {
        art.setAttribute("role", "button");
        art.setAttribute("tabindex", "0");
        art.setAttribute("aria-haspopup", "dialog");
        art.addEventListener("click", function(){ abrirModal(chave); });
        art.addEventListener("keydown", function(e){
          if(e.key === "Enter" || e.key === " "){ e.preventDefault(); abrirModal(chave); }
        });
        var b = document.createElement("b"); b.textContent = p.p;
        var s2 = document.createElement("span"); s2.textContent = "pontos";
        meta.appendChild(b); meta.appendChild(s2);
      }

      conteudo.appendChild(h); conteudo.appendChild(m); conteudo.appendChild(meta);
      art.appendChild(img); art.appendChild(conteudo);
      lista.appendChild(art);
      ativarTilt(art);
    });
  }
  desenhaProjetos();

  document.getElementById("btn-editar-proj").addEventListener("click", function(){
    editandoProj = !editandoProj;
    this.textContent = editandoProj ? "Fechar edição dos projetos" : "Editar pontos dos projetos";
    document.getElementById("aviso-projetos").textContent = editandoProj
      ? "Digite os pontos de cada projeto. Salva sozinho neste aparelho."
      : "Os pontos ficam salvos só neste aparelho, no navegador.";
    desenhaProjetos();
  });

  document.getElementById("btn-zerar-proj").addEventListener("click", function(){
    PROJETOS.forEach(function(p){ p.p = 0; });
    salvarProjetos(); desenhaProjetos();
  });

  /* ---- modal do projeto: galeria de fotos compartilhada ---- */
  var CAP = { db:null, assets:null, downloads:null, pronto:false };
  var chaveAberta = null;
  var pararDeOuvir = null;

  var elFundo = document.getElementById("modal-fundo");
  var elModal = document.getElementById("modal-proj");
  var elLogo = document.getElementById("modal-logo");
  var elTitulo = document.getElementById("modal-titulo");
  var elMissao = document.getElementById("modal-missao");
  var elGaleria = document.getElementById("modal-galeria");
  var elGaleriaVazio = document.getElementById("galeria-vazio");
  var elForm = document.getElementById("form-foto");
  var elNome = document.getElementById("input-nome");
  var elFoto = document.getElementById("input-foto");
  var elStatus = document.getElementById("form-status");
  var elBtnEnviar = document.getElementById("btn-enviar-foto");
  var focoAnterior = null;

  var timeoutGaleria = null;

  function combinarFotosProjeto(chave, remotas){
    return listarUploads("foto", chave).then(function(locais){
      locais.forEach(function(item){ item.src = urlDoUpload(item); });
      var projeto = PROJ_POR_CHAVE[chave];
      return (projeto && projeto.fotos ? projeto.fotos.slice() : []).concat(locais, remotas || []);
    });
  }

  function abrirModal(chave){
    var p = PROJ_POR_CHAVE[chave];
    if(!p) return;
    chaveAberta = chave;
    focoAnterior = document.activeElement;

    elModal.style.setProperty("--cor-modal", p.c);
    elLogo.src = p.img; elLogo.alt = p.n;
    elTitulo.textContent = p.n;
    elMissao.textContent = p.m;
    if(p.fotos && p.fotos.length){
      desenharGaleria(p.fotos);
    } else {
      elGaleria.innerHTML = "";
      elGaleria.appendChild(elGaleriaVazio);
      elGaleriaVazio.textContent = "Carregando...";
      elGaleriaVazio.hidden = false;
    }
    elForm.reset();
    elForm.removeAttribute("data-sem-envio");
    elStatus.textContent = ""; elStatus.className = "form-status";

    elFundo.hidden = false;
    document.body.style.overflow = "hidden";
    elModal.focus();

    if(timeoutGaleria) clearTimeout(timeoutGaleria);
    timeoutGaleria = setTimeout(function(){
      if(chaveAberta === chave && elGaleriaVazio.textContent === "Carregando..."){
        elGaleriaVazio.textContent = "Demorou mais que o normal. Feche e abra de novo, ou dê um Ctrl+F5 na página.";
      }
    }, 8000);

    ligarGaleria(chave);
    prepararEnvio();
  }

  function fecharModal(){
    elFundo.hidden = true;
    document.body.style.overflow = "";
    chaveAberta = null;
    if(timeoutGaleria){ clearTimeout(timeoutGaleria); timeoutGaleria = null; }
    if(typeof pararDeOuvir === "function"){ pararDeOuvir(); pararDeOuvir = null; }
    if(focoAnterior && focoAnterior.focus) focoAnterior.focus();
  }

  document.getElementById("modal-fechar").addEventListener("click", fecharModal);
  elFundo.addEventListener("click", function(e){ if(e.target === elFundo) fecharModal(); });
  document.addEventListener("keydown", function(e){
    if(e.key === "Escape" && !elFundo.hidden) fecharModal();
  });

  function desenharGaleria(fotos){
    elGaleria.innerHTML = "";
    if(!fotos.length){
      elGaleriaVazio.textContent = "Nenhuma foto ainda. Seja o primeiro.";
      elGaleriaVazio.hidden = false;
      elGaleria.appendChild(elGaleriaVazio);
      return;
    }
    fotos.forEach(function(f, indice){
      var div = document.createElement("div"); div.className = "avatar";
      var img = document.createElement("img");
      img.src = urlDoUpload(f); img.alt = f.nome || "Foto de participante"; img.loading = "lazy";
      img.addEventListener("click", function(){ abrirLightbox(fotos, indice); });

      if(f.localId || !f.src){
        var btnX = document.createElement("button");
        btnX.type = "button"; btnX.className = "avatar-excluir"; btnX.innerHTML = "✕";
        btnX.setAttribute("aria-label", "Excluir esta foto");
        btnX.addEventListener("click", function(e){
          e.stopPropagation();
          if(!window.confirm("Deseja excluir esta foto?")) return;
          btnX.disabled = true;
          var excluir = f.localId ? excluirUpload(f.localId) : (CAP.db && f.id ? CAP.db.collection("rally_membros").doc(f.id).delete() : Promise.reject(new Error("Foto ainda não carregada.")));
          excluir.then(function(){ ligarGaleria(chaveAberta); }).catch(function(){
            btnX.disabled = false;
            window.alert("Não consegui excluir essa foto agora.");
          });
        });
        div.appendChild(btnX);
      }

      div.appendChild(img);
      if(f.nome){ var sp = document.createElement("span"); sp.textContent = f.nome; div.appendChild(sp); }
      elGaleria.appendChild(div);
    });
  }

  /* ---- lightbox (foto ampliada, com navegação) ---- */
  var elLightbox = document.getElementById("lightbox-fundo");
  var elLightboxImg = document.getElementById("lightbox-img");
  var elLightboxLegenda = document.getElementById("lightbox-legenda");
  var elLightboxAnterior = document.getElementById("lightbox-anterior");
  var elLightboxProximo = document.getElementById("lightbox-proximo");
  var FOTOS_LIGHTBOX = [];
  var indiceLightbox = 0;

  function atualizarLightbox(){
    var f = FOTOS_LIGHTBOX[indiceLightbox];
    if(!f){ fecharLightbox(); return; }
    elLightboxImg.src = urlDoUpload(f);
    elLightboxImg.alt = f.nome || "Foto";
    elLightboxLegenda.textContent = f.nome || "";
    elLightboxAnterior.disabled = indiceLightbox === 0;
    elLightboxProximo.disabled = indiceLightbox === FOTOS_LIGHTBOX.length - 1;
  }
  function abrirLightbox(fotos, indice){
    FOTOS_LIGHTBOX = fotos; indiceLightbox = indice;
    atualizarLightbox();
    elLightbox.hidden = false;
  }
  function fecharLightbox(){ elLightbox.hidden = true; }
  elLightboxAnterior.addEventListener("click", function(){ if(indiceLightbox > 0){ indiceLightbox--; atualizarLightbox(); } });
  elLightboxProximo.addEventListener("click", function(){ if(indiceLightbox < FOTOS_LIGHTBOX.length - 1){ indiceLightbox++; atualizarLightbox(); } });
  document.getElementById("lightbox-fechar").addEventListener("click", fecharLightbox);
  elLightbox.addEventListener("click", function(e){ if(e.target === elLightbox) fecharLightbox(); });
  document.addEventListener("keydown", function(e){
    if(elLightbox.hidden) return;
    if(e.key === "Escape") fecharLightbox();
    if(e.key === "ArrowLeft" && indiceLightbox > 0){ indiceLightbox--; atualizarLightbox(); }
    if(e.key === "ArrowRight" && indiceLightbox < FOTOS_LIGHTBOX.length - 1){ indiceLightbox++; atualizarLightbox(); }
  });

  function ligarGaleria(chave){
    if(!CAP.db){
      combinarFotosProjeto(chave, []).then(desenharGaleria).catch(function(){ desenharGaleria((PROJ_POR_CHAVE[chave] || {}).fotos || []); });
      return;
    }
    try{
      var consulta = CAP.db.collection("rally_membros")
        .where("projeto", "==", chave)
        .orderBy("ts", "desc")
        .limit(60);
      pararDeOuvir = consulta.onSnapshot(function(snap){
        if(chaveAberta !== chave) return;
        var fotos = [];
        snap.docs.forEach(function(doc){ var d = doc.data(); fotos.push(Object.assign({id: doc.id}, d)); });
        combinarFotosProjeto(chave, fotos).then(desenharGaleria);
      }, function(){
        elGaleriaVazio.textContent = "Não consegui carregar as fotos agora.";
        elGaleriaVazio.hidden = false;
      });
    }catch(e){
      elGaleriaVazio.textContent = "Não consegui carregar as fotos agora.";
      elGaleriaVazio.hidden = false;
    }
  }

  function prepararEnvio(){
    if(!CAP.db || !CAP.assets){
      elForm.removeAttribute("data-sem-envio");
      elStatus.className = "form-status";
      elStatus.textContent = "As fotos adicionadas ficam salvas neste navegador.";
    }
  }

  elForm.addEventListener("submit", function(e){
    e.preventDefault();
    if(!chaveAberta) return;
    var arquivo = elFoto.files && elFoto.files[0];
    if(!arquivo){ return; }
    var nome = elNome.value.trim().slice(0, 40);

    elBtnEnviar.disabled = true;
    elStatus.className = "form-status";
    elStatus.textContent = "Enviando...";

    var envio;
    if(CAP.db && CAP.assets){
      envio = CAP.assets.upload(arquivo).then(function(resultado){
        return CAP.db.collection("rally_membros").add({projeto:chaveAberta, nome:nome, assetId:resultado.id, ts:Date.now()});
      });
    } else {
      envio = salvarUpload("foto", {projeto:chaveAberta, nome:nome, blob:arquivo}).then(function(){
        return combinarFotosProjeto(chaveAberta, []).then(desenharGaleria);
      });
    }
    envio.then(function(){
      elStatus.className = "form-status ok";
      elStatus.textContent = "Foto adicionada!";
      elForm.reset();
    }).catch(function(){
      elStatus.className = "form-status erro";
      elStatus.textContent = "Não deu pra enviar agora. Tenta de novo.";
    }).finally(function(){
      elBtnEnviar.disabled = false;
    });
  });

  function armarAvisoDemorado(elVazio, ms){
    setTimeout(function(){
      if(elVazio && elVazio.textContent === "Carregando..."){
        elVazio.textContent = "Demorou mais que o normal pra carregar. Feche e abra a página de novo (ou dê um Ctrl+F5).";
      }
    }, ms || 9000);
  }

  (function iniciarCapacidades(){
    if(!window.claude || typeof window.claude.use !== "function") return;
    Promise.all([window.claude.use("db"), window.claude.use("assets"), window.claude.use("downloads")]).then(function(r){
      CAP.db = r[0]; CAP.assets = r[1]; CAP.downloads = r[2]; CAP.pronto = true;
      if(chaveAberta){ ligarGaleria(chaveAberta); prepararEnvio(); }
      ligarMensagens();
      prepararEnvioMensagem();
      ligarMusicas();
      prepararEnvioMusica();
      ligarJovens();
      ligarPresencas();
      prepararCadastroJovem();
    }).catch(function(){ /* segue sem a galeria compartilhada */ });
  })();

  /* ---- mensagens em vídeo ---- */
  var elListaMsg = document.getElementById("lista-mensagens");
  var elMsgVazio = document.getElementById("mensagens-vazio");
  var elFormMsg = document.getElementById("form-mensagem");
  var elTituloMsg = document.getElementById("input-titulo-msg");
  var elVideoMsg = document.getElementById("input-video-msg");
  var elStatusMsg = document.getElementById("status-mensagem");
  var elBtnEnviarMsg = document.getElementById("btn-enviar-msg");
  var MENSAGENS_LOCAIS = [
    {titulo:"Bispo 01", src:"videos/mensagem-01.mp4"},
    {titulo:"Bispo 02", src:"videos/mensagem-02.mp4"},
    {titulo:"Bispo 03", src:"videos/mensagem-03.mp4"},
    {titulo:"Bispo 04", src:"videos/mensagem-04.mp4"},
    {titulo:"Bispo Celso 05", src:"videos/mensagem-05.mp4"},
    {titulo:"Bispo Celso 06", src:"videos/mensagem-06.mp4"}
  ];

  function combinarMensagens(remotas){
    return listarUploads("mensagem").then(function(locais){
      locais.forEach(function(item){ item.src = urlDoUpload(item); });
      return MENSAGENS_LOCAIS.concat(locais, remotas || []);
    }).catch(function(){ return MENSAGENS_LOCAIS.concat(remotas || []); });
  }

  function desenharMensagens(itens){
    elListaMsg.innerHTML = "";
    if(!itens.length){
      var p = document.createElement("p");
      p.className = "mensagens-vazio";
      p.textContent = "Nenhuma mensagem ainda. Adicione a primeira.";
      elListaMsg.appendChild(p);
      return;
    }

    var carrossel = document.createElement("div"); carrossel.className = "carrossel-msg";
    var trilho = document.createElement("div"); trilho.className = "carrossel-trilho";
    var pontos = document.createElement("div"); pontos.className = "carrossel-pontos";
    var indice = 0;

    function irPara(novoIndice){
      var videos = trilho.querySelectorAll("video");
      videos.forEach(function(v){ v.pause(); });
      indice = Math.max(0, Math.min(itens.length - 1, novoIndice));
      trilho.style.transform = "translateX(-" + (indice * 100) + "%)";
      pontos.querySelectorAll("button").forEach(function(b, i){
        b.classList.toggle("ativo", i === indice);
      });
      btnAnterior.disabled = indice === 0;
      btnProximo.disabled = indice === itens.length - 1;
    }

    itens.forEach(function(m, i){
      var card = document.createElement("div"); card.className = "msg-card";
      var video = document.createElement("video");
      video.controls = true; video.preload = "metadata";
      video.src = urlDoUpload(m);
      var h = document.createElement("h4"); h.textContent = m.titulo || "Mensagem";
      card.appendChild(video); card.appendChild(h);
      trilho.appendChild(card);

      var ponto = document.createElement("button");
      ponto.type = "button"; ponto.setAttribute("aria-label", "Ir para " + (m.titulo || "vídeo " + (i + 1)));
      ponto.addEventListener("click", function(){ irPara(i); });
      pontos.appendChild(ponto);
    });

    var btnAnterior = document.createElement("button");
    btnAnterior.type = "button"; btnAnterior.className = "carrossel-seta esquerda"; btnAnterior.innerHTML = "‹";
    btnAnterior.setAttribute("aria-label", "Vídeo anterior");
    btnAnterior.addEventListener("click", function(){ irPara(indice - 1); });

    var btnProximo = document.createElement("button");
    btnProximo.type = "button"; btnProximo.className = "carrossel-seta direita"; btnProximo.innerHTML = "›";
    btnProximo.setAttribute("aria-label", "Próximo vídeo");
    btnProximo.addEventListener("click", function(){ irPara(indice + 1); });

    carrossel.appendChild(trilho);
    if(itens.length > 1){
      carrossel.appendChild(btnAnterior);
      carrossel.appendChild(btnProximo);
    }
    elListaMsg.appendChild(carrossel);
    if(itens.length > 1){ elListaMsg.appendChild(pontos); }
    irPara(0);
  }

  function ligarMensagens(){
    if(!CAP.db){
      combinarMensagens([]).then(desenharMensagens);
      return;
    }
    try{
      armarAvisoDemorado(elMsgVazio);
      CAP.db.collection("rally_mensagens").orderBy("ts", "desc").limit(30).onSnapshot(function(snap){
        var itens = [];
        snap.docs.forEach(function(doc){ itens.push(doc.data()); });
        combinarMensagens(itens).then(desenharMensagens);
      }, function(){
        elMsgVazio.textContent = "Não consegui carregar as mensagens agora.";
      });
    }catch(e){
      elMsgVazio.textContent = "Não consegui carregar as mensagens agora.";
    }
  }

  ligarMensagens();

  function prepararEnvioMensagem(){
    if(!CAP.db || !CAP.assets){
      elFormMsg.removeAttribute("data-sem-envio");
      elStatusMsg.textContent = "Os vídeos adicionados ficam salvos neste navegador.";
    }
  }

  prepararEnvioMensagem();

  elFormMsg.addEventListener("submit", function(e){
    e.preventDefault();
    var arquivo = elVideoMsg.files && elVideoMsg.files[0];
    if(!arquivo) return;
    var titulo = elTituloMsg.value.trim().slice(0, 60) || "Mensagem";

    elBtnEnviarMsg.disabled = true;
    elStatusMsg.className = "form-status";
    elStatusMsg.textContent = "Enviando vídeo...";

    var envio;
    if(CAP.db && CAP.assets){
      envio = CAP.assets.upload(arquivo).then(function(resultado){
        return CAP.db.collection("rally_mensagens").add({titulo:titulo, assetId:resultado.id, ts:Date.now()});
      });
    } else {
      envio = salvarUpload("mensagem", {titulo:titulo, blob:arquivo}).then(function(){
        return combinarMensagens([]).then(desenharMensagens);
      });
    }
    envio.then(function(){
      elStatusMsg.className = "form-status ok";
      elStatusMsg.textContent = "Mensagem adicionada!";
      elFormMsg.reset();
    }).catch(function(){
      elStatusMsg.className = "form-status erro";
      elStatusMsg.textContent = "Não deu pra enviar agora (vídeos muito grandes podem falhar). Tenta de novo.";
    }).finally(function(){
      elBtnEnviarMsg.disabled = false;
    });
  });

  /* ---- painel de músicas ---- */
  var elPainelMusicas = document.getElementById("painel-musicas");
  var elMusicasVazio = document.getElementById("musicas-vazio");
  var elFormMusica = document.getElementById("form-musica");
  var elTituloMusica = document.getElementById("input-titulo-musica");
  var elArquivoMusica = document.getElementById("input-arquivo-musica");
  var elStatusMusica = document.getElementById("status-musica");
  var elBtnEnviarMusica = document.getElementById("btn-enviar-musica");
  var audioAtual = null;
  var MUSICAS_LOCAIS = [
    {titulo:"Vitória no Deserto", src:"musicas/01%20-%20Vitoria%20no%20Deserto.mp4"},
    {titulo:"Celebrai a Cristo", src:"musicas/02%20-%20Celebrai%20a%20Cristo.mp4"},
    {titulo:"Fonte Universal 2", src:"musicas/03%20-%20Fonte%20Universal%202.mp4"},
    {titulo:"1000 Graus", src:"musicas/04%20-%201000%20Graus.mp4"},
    {titulo:"Akeko", src:"musicas/05%20-%20Akeko.mp4"},
    {titulo:"Andre e Felipe - Adore", src:"musicas/06%20-%20Andre%20e%20Felipe%20-%20Adore.mp4"},
    {titulo:"Faixa AUD-20250426", src:"musicas/07%20-%20Faixa%20AUD-20250426.mp4"},
    {titulo:"Eu Sou Forte", src:"musicas/08%20-%20Eu%20Sou%20Forte.mp4"},
    {titulo:"Medley Axe", src:"musicas/09%20-%20Medley%20Axe.mp4"},
    {titulo:"Joga a Rede", src:"musicas/10%20-%20Joga%20a%20Rede.mp4"},
    {titulo:"Recording 14", src:"musicas/11%20-%20Recording%2014.mp4"},
    {titulo:"Medley FJU Parte 2", src:"musicas/12%20-%20Medley%20FJU%20Parte%202.mp4"}
  ];

  function combinarMusicas(remotas){
    return listarUploads("musica").then(function(locais){
      locais.forEach(function(item){ item.src = urlDoUpload(item); });
      return MUSICAS_LOCAIS.concat(locais, remotas || []);
    }).catch(function(){ return MUSICAS_LOCAIS.concat(remotas || []); });
  }

  function pararTudo(){
    if(audioAtual){ audioAtual.pause(); }
  }

  var radioAudio = document.getElementById("radio-live");
  var btnRadio = document.getElementById("btn-radio");
  var statusRadio = document.getElementById("status-radio");
  var timeoutRadio = null;

  function definirRadioTocando(){
    if(timeoutRadio){ clearTimeout(timeoutRadio); timeoutRadio = null; }
    btnRadio.disabled = false;
    btnRadio.setAttribute("aria-pressed", "true");
    btnRadio.setAttribute("aria-label", "Parar Rádio Aleluia");
    btnRadio.querySelector("span").textContent = "Ⅱ";
    statusRadio.className = "radio-status tocando";
    statusRadio.textContent = "Ao vivo · Rede Aleluia 98,3 FM · Franca/SP";
  }

  function definirRadioErro(mensagem){
    if(timeoutRadio){ clearTimeout(timeoutRadio); timeoutRadio = null; }
    radioAudio.pause();
    btnRadio.disabled = false;
    btnRadio.setAttribute("aria-pressed", "false");
    btnRadio.setAttribute("aria-label", "Tocar Rádio Aleluia");
    btnRadio.querySelector("span").textContent = "▶";
    statusRadio.className = "radio-status erro";
    statusRadio.textContent = mensagem;
  }

  function pararRadio(mensagem){
    radioAudio.pause();
    radioAudio.currentTime = 0;
    if(timeoutRadio){ clearTimeout(timeoutRadio); timeoutRadio = null; }
    btnRadio.setAttribute("aria-pressed", "false");
    btnRadio.setAttribute("aria-label", "Tocar Rádio Aleluia");
    btnRadio.querySelector("span").textContent = "▶";
    statusRadio.className = "radio-status";
    statusRadio.textContent = mensagem || "Rádio pausada";
  }

  btnRadio.addEventListener("click", function(){
    if(!radioAudio.paused){ pararRadio(); return; }
    pararTudo();
    statusRadio.className = "radio-status";
    statusRadio.textContent = "Conectando à Rede Aleluia…";
    radioAudio.play().then(function(){
      if(radioAudio.readyState >= 2 && !radioAudio.paused) definirRadioTocando();
    }).catch(function(){
      definirRadioErro("Não foi possível conectar. Tente a transmissão oficial abaixo.");
    });
    timeoutRadio = setTimeout(function(){
      if(radioAudio.readyState < 2){
        definirRadioErro("O stream não respondeu. Tente a transmissão oficial abaixo.");
      }
    }, 12000);
  });

  radioAudio.addEventListener("playing", definirRadioTocando);

  radioAudio.addEventListener("error", function(){
    definirRadioErro("A transmissão caiu. Tente o site oficial abaixo.");
  });

  radioAudio.addEventListener("pause", function(){
    btnRadio.setAttribute("aria-pressed", "false");
    btnRadio.querySelector("span").textContent = "▶";
    btnRadio.setAttribute("aria-label", "Tocar Rádio Aleluia");
    if(statusRadio.classList.contains("tocando")){
      statusRadio.className = "radio-status";
      statusRadio.textContent = "Rádio pausada";
    }
  });

  function desenharMusicas(itens){
    pararTudo();
    audioAtual = null;
    elPainelMusicas.innerHTML = "";
    if(!itens.length){
      var p = document.createElement("p");
      p.className = "musica-vazia";
      p.textContent = "Nenhuma música ainda. Adicione a primeira.";
      elPainelMusicas.appendChild(p);
      return;
    }

    var carrossel = document.createElement("div"); carrossel.className = "carrossel-msg carrossel-faixas";
    var trilho = document.createElement("div"); trilho.className = "carrossel-trilho";
    var pontos = document.createElement("div"); pontos.className = "carrossel-pontos";
    var indice = 0;

    function irPara(novoIndice){
      trilho.querySelectorAll("video").forEach(function(v){ v.pause(); });
      indice = Math.max(0, Math.min(itens.length - 1, novoIndice));
      trilho.style.transform = "translateX(-" + (indice * 100) + "%)";
      pontos.querySelectorAll("button").forEach(function(b, i){ b.classList.toggle("ativo", i === indice); });
      btnAnterior.disabled = indice === 0;
      btnProximo.disabled = indice === itens.length - 1;
    }

    itens.forEach(function(m, i){
      var faixa = document.createElement("div"); faixa.className = "faixa faixa-carrossel";
      var btn = document.createElement("button");
      btn.type = "button"; btn.className = "faixa-play"; btn.textContent = "▶";
      btn.setAttribute("aria-label", "Tocar " + (m.titulo || "música"));
      var titulo = document.createElement("span"); titulo.className = "faixa-titulo"; titulo.textContent = m.titulo || "Música";
      var barra = document.createElement("i"); barra.className = "faixa-progresso";

      var audio = document.createElement("video");
      audio.src = urlDoUpload(m);
      audio.preload = "none";
      audio.playsInline = true;
      audio.className = "faixa-video-oculto";
      faixa.appendChild(audio);

      btn.addEventListener("click", function(){
        if(audio.paused){
          pararRadio("Rádio pausada");
          if(audioAtual && audioAtual !== audio){ audioAtual.pause(); }
          audio.play().catch(function(){
            elStatusMusica.className = "form-status erro";
            elStatusMusica.textContent = "Não consegui tocar essa faixa agora.";
          });
          audioAtual = audio;
        } else {
          audio.pause();
        }
      });
      audio.addEventListener("play", function(){ faixa.classList.add("tocando"); btn.textContent = "⏸"; });
      audio.addEventListener("pause", function(){ faixa.classList.remove("tocando"); btn.textContent = "▶"; });
      audio.addEventListener("ended", function(){ faixa.classList.remove("tocando"); btn.textContent = "▶"; barra.style.width = "0%"; });
      audio.addEventListener("timeupdate", function(){
        if(audio.duration){ barra.style.width = (audio.currentTime / audio.duration * 100) + "%"; }
      });

      faixa.appendChild(btn); faixa.appendChild(titulo); faixa.appendChild(barra);

      if(m.localId || m.id){
        var btnExcluirMusica = document.createElement("button");
        btnExcluirMusica.type = "button"; btnExcluirMusica.className = "faixa-excluir"; btnExcluirMusica.innerHTML = "✕";
        btnExcluirMusica.setAttribute("aria-label", "Excluir " + (m.titulo || "esta música"));
        btnExcluirMusica.addEventListener("click", function(e){
          e.stopPropagation();
          if(!window.confirm('Deseja excluir "' + (m.titulo || "esta música") + '"?')) return;
          btnExcluirMusica.disabled = true;
          audio.pause();
          var excluir = m.localId ? excluirUpload(m.localId) : CAP.db.collection("rally_musicas").doc(m.id).delete();
          excluir.then(function(){ ligarMusicas(); }).catch(function(){
            btnExcluirMusica.disabled = false;
            window.alert("Não consegui excluir essa música agora.");
          });
        });
        faixa.appendChild(btnExcluirMusica);
      }

      trilho.appendChild(faixa);

      var ponto = document.createElement("button");
      ponto.type = "button"; ponto.setAttribute("aria-label", "Ir para " + (m.titulo || "faixa " + (i + 1)));
      ponto.addEventListener("click", function(){ irPara(i); });
      pontos.appendChild(ponto);
    });

    var btnAnterior = document.createElement("button");
    btnAnterior.type = "button"; btnAnterior.className = "carrossel-seta esquerda"; btnAnterior.innerHTML = "‹";
    btnAnterior.setAttribute("aria-label", "Música anterior");
    btnAnterior.addEventListener("click", function(){ irPara(indice - 1); });

    var btnProximo = document.createElement("button");
    btnProximo.type = "button"; btnProximo.className = "carrossel-seta direita"; btnProximo.innerHTML = "›";
    btnProximo.setAttribute("aria-label", "Próxima música");
    btnProximo.addEventListener("click", function(){ irPara(indice + 1); });

    carrossel.appendChild(trilho);
    if(itens.length > 1){
      carrossel.appendChild(btnAnterior);
      carrossel.appendChild(btnProximo);
    }
    elPainelMusicas.appendChild(carrossel);
    if(itens.length > 1){ elPainelMusicas.appendChild(pontos); }
    irPara(0);
  }

  function ligarMusicas(){
    if(!CAP.db){
      combinarMusicas([]).then(desenharMusicas);
      return;
    }
    try{
      armarAvisoDemorado(elMusicasVazio);
      CAP.db.collection("rally_musicas").orderBy("ts", "asc").limit(60).onSnapshot(function(snap){
        var itens = [];
        snap.docs.forEach(function(doc){ var d = doc.data(); d.id = doc.id; itens.push(d); });
        combinarMusicas(itens).then(desenharMusicas);
      }, function(){
        elMusicasVazio.textContent = "Não consegui carregar as músicas agora.";
      });
    }catch(e){
      elMusicasVazio.textContent = "Não consegui carregar as músicas agora.";
    }
  }

  ligarMusicas();

  function prepararEnvioMusica(){
    if(!CAP.db || !CAP.assets){
      elFormMusica.removeAttribute("data-sem-envio");
      elStatusMusica.textContent = "As músicas adicionadas ficam salvas neste navegador.";
    }
  }

  prepararEnvioMusica();

  elFormMusica.addEventListener("submit", function(e){
    e.preventDefault();
    var arquivo = elArquivoMusica.files && elArquivoMusica.files[0];
    if(!arquivo) return;
    var titulo = elTituloMusica.value.trim().slice(0, 70) || "Música";

    elBtnEnviarMusica.disabled = true;
    elStatusMusica.className = "form-status";
    elStatusMusica.textContent = "Enviando música...";

    var envio;
    if(CAP.db && CAP.assets){
      envio = CAP.assets.upload(arquivo).then(function(resultado){
        return CAP.db.collection("rally_musicas").add({titulo:titulo, assetId:resultado.id, ts:Date.now()});
      });
    } else {
      envio = salvarUpload("musica", {titulo:titulo, blob:arquivo}).then(function(){ ligarMusicas(); });
    }
    envio.then(function(){
      elStatusMusica.className = "form-status ok";
      elStatusMusica.textContent = "Música adicionada!";
      elFormMusica.reset();
    }).catch(function(){
      elStatusMusica.className = "form-status erro";
      elStatusMusica.textContent = "Não deu pra enviar agora (arquivo muito grande pode falhar). Tenta de novo.";
    }).finally(function(){
      elBtnEnviarMusica.disabled = false;
    });
  });

  /* ---- compartilhar placar como imagem ---- */
  function gerarImagemPlacar(){
    var W = 1000, H = 560;
    var canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    var ctx = canvas.getContext("2d");

    var fundo = ctx.createLinearGradient(0, 0, 0, H);
    fundo.addColorStop(0, "#0F1938");
    fundo.addColorStop(1, "#080E24");
    ctx.fillStyle = fundo;
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = "rgba(224,180,74,.4)";
    ctx.lineWidth = 3;
    ctx.strokeRect(10, 10, W-20, H-20);

    ctx.textAlign = "center";
    ctx.fillStyle = "#E0B44A";
    ctx.font = "700 22px Barlow Condensed, Arial";
    ctx.fillText("RALLY DIFERENÇA · FJU SEDE REDENTOR", W/2, 62);

    var tj = PROVAS.reduce(function(s,p){ return s + p.j; }, 0);
    var tl = PROVAS.reduce(function(s,p){ return s + p.l; }, 0);

    ctx.font = "700 44px Barlow Condensed, Arial";
    ctx.fillStyle = "#3FD98D"; ctx.fillText("JUDÁ", W*0.27, 200);
    ctx.fillStyle = "#FF5D9E"; ctx.fillText("LEVI", W*0.73, 200);

    ctx.font = "900 130px Anton, Impact, Arial";
    ctx.fillStyle = "#F2EEE3";
    ctx.fillText(String(tj), W*0.27, 330);
    ctx.fillText(String(tl), W*0.73, 330);

    ctx.font = "700 30px Barlow Condensed, Arial";
    ctx.fillStyle = "#E0B44A";
    ctx.fillText("✕", W*0.5, 300);

    var soma = tj + tl;
    var pj = soma ? Math.round(tj / soma * 100) : 50;
    var barX = W*0.12, barY = 400, barW = W*0.76, barH = 22;
    ctx.fillStyle = "#17224a";
    ctx.fillRect(barX, barY, barW, barH);
    ctx.fillStyle = "#3FD98D";
    ctx.fillRect(barX, barY, barW * pj/100, barH);
    ctx.fillStyle = "#FF5D9E";
    ctx.fillRect(barX + barW*pj/100, barY, barW * (100-pj)/100, barH);

    ctx.font = "600 20px Barlow Condensed, Arial";
    ctx.fillStyle = "#9AA1B8";
    var texto = tj === tl ? "Empate técnico" : (tj > tl ? "Judá na frente por " + (tj-tl) : "Levi na frente por " + (tl-tj));
    ctx.fillText(texto, W/2, 462);

    ctx.font = "600 16px Barlow Condensed, Arial";
    ctx.fillStyle = "#6b7290";
    ctx.fillText("Rally Diferença · Todo Sábado às 15h", W/2, 520);

    return canvas;
  }

  function compartilharPlacar(){
    var elStatusShare = document.getElementById("status-compartilhar");
    elStatusShare.className = "form-status";
    elStatusShare.textContent = "Preparando imagem...";

    if(document.fonts && document.fonts.ready){
      document.fonts.ready.then(desenhar);
    } else {
      desenhar();
    }

    function desenhar(){
      var canvas = gerarImagemPlacar();
      canvas.toBlob(function(blob){
        if(!blob){
          elStatusShare.className = "form-status erro";
          elStatusShare.textContent = "Não consegui gerar a imagem.";
          return;
        }
        var arquivo = new File([blob], "placar-rally-fju.png", {type:"image/png"});

        if(navigator.share && navigator.canShare && navigator.canShare({files:[arquivo]})){
          navigator.share({files:[arquivo], title:"Placar Rally Diferença"}).then(function(){
            elStatusShare.className = "form-status ok";
            elStatusShare.textContent = "Compartilhado!";
          }).catch(function(err){
            if(err && err.name === "AbortError"){ elStatusShare.textContent = ""; return; }
            elStatusShare.className = "form-status erro";
            elStatusShare.textContent = "Não deu pra compartilhar agora.";
          });
          return;
        }

        if(CAP.downloads){
          CAP.downloads.save({filename:"placar-rally-fju.png", data:blob}).then(function(){
            elStatusShare.className = "form-status ok";
            elStatusShare.textContent = "Imagem salva! Agora é só anexar no WhatsApp.";
          }).catch(function(err){
            if(err && err.code === "declined"){ elStatusShare.textContent = ""; return; }
            elStatusShare.className = "form-status erro";
            elStatusShare.textContent = "Não deu pra salvar agora.";
          });
          return;
        }

        try{
          var url = URL.createObjectURL(blob);
          var a = document.createElement("a");
          a.href = url; a.download = "placar-rally-fju.png";
          document.body.appendChild(a); a.click(); a.remove();
          setTimeout(function(){ URL.revokeObjectURL(url); }, 4000);
          elStatusShare.className = "form-status ok";
          elStatusShare.textContent = "Imagem baixada! Agora é só anexar no WhatsApp.";
        }catch(e){
          elStatusShare.className = "form-status erro";
          elStatusShare.textContent = "Não consegui baixar a imagem neste navegador.";
        }
      }, "image/png");
    }
  }

  document.getElementById("btn-compartilhar").addEventListener("click", compartilharPlacar);

  /* ---- quiz ---- */
  var PERGUNTAS = [
    {q:"De qual mãe Judá era filho?", a:["Lia","Raquel","Bila","Zilpa"], c:0,
     e:"Judá foi o quarto filho de Jacó com Lia (Gênesis 29:35)."},
    {q:"Qual animal representa a tribo de Judá?", a:["O leão","A águia","O boi","O cordeiro"], c:0,
     e:"“Judá é um leãozinho”, disse Jacó ao abençoar seus filhos (Gênesis 49:9)."},
    {q:"O que significa o nome Judá?", a:["Louvor","Força","Aliança","Herdeiro"], c:0,
     e:"Lia o chamou assim dizendo: “Esta vez louvarei ao Senhor”."},
    {q:"Qual era a função da tribo de Levi em Israel?", a:["Cuidar do tabernáculo e do serviço sacerdotal","Comandar o exército","Cobrar impostos","Guardar as fronteiras"], c:0,
     e:"Os levitas foram separados para o serviço da casa de Deus (Números 3:6-8)."},
    {q:"Qual tribo não recebeu um território próprio em Canaã?", a:["Levi","Judá","Benjamim","Dã"], c:0,
     e:"A herança de Levi era o próprio Senhor; eles receberam cidades espalhadas entre as tribos."},
    {q:"Moisés e Arão eram de qual tribo?", a:["Levi","Judá","Efraim","Rúben"], c:0,
     e:"Os dois eram filhos de Anrão, da tribo de Levi (Êxodo 6:20)."},
    {q:"O rei Davi pertencia a qual tribo?", a:["Judá","Levi","Benjamim","Simeão"], c:0,
     e:"Davi era de Belém de Judá, filho de Jessé."},
    {q:"O peitoral de doze pedras, que aparece no emblema de Levi, era usado por quem?", a:["O sumo sacerdote","O rei","O profeta","O juiz"], c:0,
     e:"Arão levava sobre o coração os nomes das doze tribos (Êxodo 28:29)."},
    {q:"Em Apocalipse 5:5, Jesus é chamado “o Leão da tribo de...”", a:["Judá","Levi","José","Israel"], c:0,
     e:"O Leão da tribo de Judá, a raiz de Davi, que venceu."},
    {q:"Quantas tribos formavam o povo de Israel?", a:["Doze","Sete","Dez","Quatorze"], c:0,
      e:"Doze, uma para cada filho de Jacó."},
        {q:"Quem era o pai de Judá?", a:["Jacó","Isaque","Abraão","José"], c:0,
      e:"Judá era filho de Jacó e Lia (Gênesis 29:35)."},
        {q:"Qual era a posição de Judá entre os filhos de Jacó?", a:["Quarto","Primeiro","Sétimo","Décimo segundo"], c:0,
      e:"Judá foi o quarto filho de Jacó e Lia (Gênesis 29:35)."},
        {q:"Qual foi a atitude de Judá quando Benjamin corria risco no Egito?", a:["Ofereceu-se para ficar no lugar dele","Fugiu do Egito","Pediu para vender Benjamin","Voltou sozinho a Canaã"], c:0,
      e:"Judá pediu para ficar como servo no lugar de Benjamin (Gênesis 44:33)."},
        {q:"Quais eram os nomes dos filhos de Judá com Tamar?", a:["Perez e Zerá","Efraim e Manassés","Gade e Aser","Nadabe e Abiú"], c:0,
      e:"Tamar deu à luz os gêmeos Perez e Zerá (Gênesis 38:27-30)."},
        {q:"De qual filho de Judá descendeu a família de Davi?", a:["Perez","Zerá","Er","Onã"], c:0,
      e:"A genealogia de Davi passa por Perez (Rute 4:18-22)."},
        {q:"Em que cidade Davi nasceu?", a:["Belém","Jericó","Hebrom","Nazaré"], c:0,
      e:"Davi era de Belém, na região de Judá (1 Samuel 17:12)."},
        {q:"Como se chamava o pai do rei Davi?", a:["Jessé","Saul","Salomão","Boaz"], c:0,
      e:"Davi era filho de Jessé, o belemita (1 Samuel 16:1)."},
        {q:"Qual profeta ungiu Davi como rei?", a:["Samuel","Natã","Elias","Eliseu"], c:0,
      e:"Samuel ungiu Davi por ordem do Senhor (1 Samuel 16:12-13)."},
        {q:"Quem foi o filho de Davi que construiu o templo em Jerusalém?", a:["Salomão","Absalão","Natã","Adonias"], c:0,
      e:"Salomão construiu o templo do Senhor (1 Reis 6:1)."},
        {q:"Qual cidade Davi estabeleceu como capital do seu reino?", a:["Jerusalém","Samaria","Betel","Damasco"], c:0,
      e:"Davi conquistou a fortaleza de Sião e fez dela a Cidade de Davi (2 Samuel 5:7-9)."},
        {q:"Depois da divisão do reino, quem governou o reino de Judá?", a:["Roboão","Jeroboão","Acabe","Saul"], c:0,
      e:"Roboão reinou sobre Judá depois da divisão (1 Reis 12:17)."},
        {q:"Quais tribos formaram o reino do sul, chamado reino de Judá?", a:["Judá e Benjamim","Judá e Levi somente","Efraim e Manassés","Dã e Aser"], c:0,
      e:"Judá e Benjamim permaneceram com a casa de Davi (1 Reis 12:21)."},
        {q:"Em que cidade foi construído o templo de Salomão?", a:["Jerusalém","Belém","Jericó","Nínive"], c:0,
      e:"Salomão construiu o templo em Jerusalém, no monte Moriá (2 Crônicas 3:1)."},
        {q:"Qual rei de Judá promoveu uma grande reforma e reparou o templo?", a:["Josias","Acabe","Saul","Herodes"], c:0,
      e:"Josias ordenou reparos no templo e renovou a aliança (2 Reis 22:3-5)."},
        {q:"Quem foi a bisavó do rei Davi, esposa de Boaz?", a:["Rute","Ester","Débora","Miriã"], c:0,
      e:"Rute e Boaz foram pais de Obede, avô de Davi (Rute 4:13, 17)."},
        {q:"Qual era o nome da mãe de Judá?", a:["Lia","Raquel","Bila","Zilpa"], c:0,
      e:"Judá era filho de Lia e Jacó (Gênesis 29:35)."},
        {q:"Que objeto é associado ao cetro na bênção de Jacó sobre Judá?", a:["O bastão de governante","A harpa de Davi","A arca da aliança","O peitoral sacerdotal"], c:0,
      e:"Jacó falou do cetro e do bastão de autoridade em sua bênção sobre Judá (Gênesis 49:10)."},
        {q:"Qual juiz de Israel pertencia à tribo de Judá?", a:["Otniel","Sansão","Gideão","Eúde"], c:0,
      e:"Otniel era da família de Calebe, da tribo de Judá (Juízes 3:9)."},
        {q:"Qual rainha, da linhagem real de Judá, salvou seu povo na Pérsia?", a:["Ester","Rute","Jezabel","Atalia"], c:0,
      e:"Ester era judia e intercedeu pelo seu povo diante do rei (Ester 2:5-7; 7:3-4)."},
        {q:"Quem era o pai de Levi?", a:["Jacó","Isaque","Abraão","José"], c:0,
      e:"Levi era um dos filhos de Jacó e Lia (Gênesis 29:34)."},
        {q:"Qual era a posição de Levi entre os filhos de Jacó?", a:["Terceiro","Primeiro","Quarto","Décimo segundo"], c:0,
      e:"Levi foi o terceiro filho de Jacó e Lia (Gênesis 29:31-34)."},
        {q:"Quem eram os irmãos de Moisés da tribo de Levi?", a:["Arão e Miriã","Josué e Calebe","Davi e Jônatas","Efraim e Manassés"], c:0,
      e:"Arão e Miriã eram irmãos de Moisés (Êxodo 15:20; 1 Crônicas 6:3)."},
        {q:"Quem foi o primeiro sumo sacerdote de Israel?", a:["Arão","Moisés","Josué","Samuel"], c:0,
      e:"Arão foi consagrado para servir como sumo sacerdote (Êxodo 28:1; 29:9)."},
        {q:"Quais eram os três clãs principais dos levitas?", a:["Gerson, Coate e Merari","Judá, Benjamim e Simeão","Efraim, Manassés e Issacar","Dã, Aser e Naftali"], c:0,
      e:"Os clãs levitas descendiam de Gerson, Coate e Merari (Números 3:17)."},
        {q:"Quantas cidades os levitas receberam para habitar?", a:["Quarenta e oito","Doze","Setenta","Trinta"], c:0,
      e:"As cidades levíticas eram quarenta e oito, incluindo cidades de refúgio (Números 35:7)."},
        {q:"Quantas cidades de refúgio foram separadas entre as cidades levíticas?", a:["Seis","Doze","Três","Quarenta e oito"], c:0,
      e:"Seis cidades foram separadas como cidades de refúgio (Números 35:6)."},
        {q:"Qual era o papel especial dos levitas no tabernáculo?", a:["Servir e cuidar do tabernáculo","Governar todas as tribos","Construir carros de guerra","Cobrar impostos das nações"], c:0,
      e:"Os levitas foram separados para auxiliar no serviço do tabernáculo (Números 3:6-8)."},
        {q:"Qual clã levita cuidava das cortinas e coberturas do tabernáculo?", a:["Gersonitas","Coatitas","Meraritas","Benjamitas"], c:0,
      e:"Os gersonitas cuidavam das cortinas, coberturas e véus (Números 4:24-26)."},
        {q:"Qual clã levita cuidava das armações e colunas do tabernáculo?", a:["Meraritas","Gersonitas","Coatitas","Judaitas"], c:0,
      e:"Os meraritas transportavam as armações, barras, colunas e bases (Números 4:31-32)."},
        {q:"Qual clã levita transportava os objetos sagrados do tabernáculo?", a:["Coatitas","Gersonitas","Meraritas","Aseritas"], c:0,
      e:"Os coatitas cuidavam do transporte dos objetos sagrados, depois de cobertos pelos sacerdotes (Números 4:4-15)."},
        {q:"De qual tribo era Corá, que se rebelou contra Moisés?", a:["Levi","Judá","Benjamim","Aser"], c:0,
      e:"Corá era filho de Coate, descendente de Levi (Êxodo 6:18, 21; Números 16:1)."},
        {q:"Quem sucedeu Arão como sumo sacerdote?", a:["Eleazar","Itamar","Fineias","Josué"], c:0,
      e:"Eleazar recebeu as vestes sacerdotais de Arão e o sucedeu (Números 20:25-28)."},
        {q:"O que os levitas recebiam como herança em vez de um território tribal contínuo?", a:["O Senhor e cidades entre as tribos","O reino do Egito","A cidade de Jerusalém inteira","A terra dos filisteus"], c:0,
      e:"O Senhor declarou ser a herança dos levitas; eles receberam cidades espalhadas (Números 18:20; Josué 21)."},
        {q:"Quem cuidava do transporte da arca da aliança?", a:["Os levitas designados","Qualquer soldado","Somente o rei","Os comerciantes de Israel"], c:0,
      e:"Davi reuniu os descendentes de Arão e os levitas para transportar a arca (1 Crônicas 15:2, 11-15)."},
        {q:"Qual grupo de levitas é citado como responsável por louvar com instrumentos no templo?", a:["Cantores levitas","Guardas filisteus","Construtores de Jericó","Mensageiros persas"], c:0,
      e:"Davi designou levitas para cantar e tocar instrumentos no serviço de louvor (1 Crônicas 15:16)."},
        {q:"De qual tribo era Fineias, conhecido por seu zelo pelo Senhor?", a:["Levi","Judá","Issacar","Dã"], c:0,
      e:"Fineias era filho de Eleazar e neto de Arão (Números 25:7; Êxodo 6:25)."},
        {q:"Quem ajudava os sacerdotes no serviço do santuário?", a:["Os levitas","Os filisteus","Os amalequitas","Os egípcios"], c:0,
      e:"Os levitas auxiliavam os sacerdotes nos deveres relacionados à tenda do encontro (Números 18:2-4)."},
        {q:"Qual tribo foi escolhida para servir no lugar dos primogênitos de Israel?", a:["Levi","Judá","Rúben","Simeão"], c:0,
      e:"O Senhor tomou os levitas para si no lugar dos primogênitos (Números 3:12-13)."},
        {q:"Qual livro da Bíblia descreve muitas responsabilidades dos sacerdotes e levitas?", a:["Levítico","Rute","Ester","Obadias"], c:0,
      e:"Levítico reúne instruções sobre o culto, os sacerdotes e a vida do povo de Israel."},
        {q:"Quem era o pai de Moisés e Arão?", a:["Anrão","Jessé","Boaz","Elcana"], c:0,
      e:"Moisés e Arão eram filhos de Anrão e Joquebede, da tribo de Levi (Êxodo 6:20)."},
        {q:"Qual era o nome da mãe de Moisés e Arão?", a:["Joquebede","Miriã","Débora","Ester"], c:0,
      e:"Joquebede, filha de Levi, foi mãe de Moisés, Arão e Miriã (Números 26:59)."},
        {q:"Que instrumento Miriã tocou ao celebrar a travessia do mar?", a:["Tamborim","Harpa","Trombeta de prata","Címbalo de bronze"], c:0,
      e:"Miriã pegou um tamborim, e as mulheres a acompanharam com dança (Êxodo 15:20)."},
        {q:"Quem abençoou o povo com as palavras “O Senhor te abençoe e te guarde”?", a:["Os sacerdotes","Os soldados de Judá","Os reis do Egito","Os pescadores da Galileia"], c:0,
      e:"Deus instruiu Arão e seus filhos, sacerdotes, a pronunciar essa bênção (Números 6:22-27)."},
        {q:"Qual cidade de refúgio ficava na região montanhosa de Judá?", a:["Hebrom","Jericó","Betel","Dã"], c:0,
      e:"Hebrom, na região montanhosa de Judá, foi separada como cidade de refúgio e cidade levítica (Josué 20:7; 21:11-13)."},
        {q:"Qual apóstolo escreveu que Jesus é o Leão da tribo de Judá?", a:["João","Pedro","Paulo","Tiago"], c:0,
      e:"João registrou essa visão no Apocalipse (Apocalipse 5:5)."},
        {q:"Na visão de Apocalipse, quem venceu e pôde abrir o livro?", a:["O Leão da tribo de Judá","O rei Saul","O sacerdote Eli","O profeta Jonas"], c:0,
      e:"Um dos anciãos anunciou o Leão da tribo de Judá, a raiz de Davi, como vencedor (Apocalipse 5:5)."},
        {q:"Qual era o nome do filho de Jacó que deu nome à tribo de Levi?", a:["Levi","Judá","Benjamim","José"], c:0,
      e:"A tribo recebeu o nome de Levi, filho de Jacó e Lia."},
        {q:"Que tarefa os levitas realizavam quando o acampamento de Israel se deslocava?", a:["Desmontar, transportar e montar o tabernáculo","Plantar vinhas para o faraó","Construir muralhas em Jericó","Escolher o rei de Moabe"], c:0,
      e:"Cada clã levita recebeu responsabilidades específicas para transportar as partes do tabernáculo (Números 4)."},
        {q:"Quem foi escolhido para cuidar dos utensílios do santuário entre os coatitas?", a:["Eleazar, filho de Arão","Roboão, filho de Salomão","Jessé, pai de Davi","Balaque, rei de Moabe"], c:0,
      e:"Eleazar supervisionava o azeite, o incenso, as ofertas e os utensílios sagrados (Números 4:16)."},
        {q:"Qual era o nome do filho de Rute e Boaz, ancestral de Davi?", a:["Obede","Isaque","Esaú","Levi"], c:0,
      e:"Rute deu à luz Obede, pai de Jessé e avô de Davi (Rute 4:17)."},
        {q:"A qual tribo pertencia o rei Davi?", a:["Judá","Levi","Aser","Naftali"], c:0,
      e:"Davi era da tribo de Judá, da família de Jessé (1 Samuel 17:12; Mateus 1:2-3)."},
        {q:"Qual tribo foi separada para o serviço religioso de Israel?", a:["Levi","Judá","Dã","Zebulom"], c:0,
      e:"Os levitas foram separados para servir no tabernáculo e auxiliar os sacerdotes (Deuteronômio 10:8)."},
        {q:"Que promessa de Jacó sobre Judá é associada à autoridade real?", a:["O cetro não se arredaria de Judá","Judá construiria a arca","Judá seria sacerdote no Egito","Judá atravessaria o Jordão sozinho"], c:0,
      e:"A bênção de Jacó associa Judá ao cetro e à autoridade (Gênesis 49:10)."}
  ];

  var ordem = [], atual = 0, acertos = 0, tribo = null;

  function embaralha(v){
    var a = v.slice();
    for(var i = a.length - 1; i > 0; i--){
      var k = Math.floor(Math.random() * (i + 1));
      var tmp = a[i]; a[i] = a[k]; a[k] = tmp;
    }
    return a;
  }

  document.getElementById("chip-j").addEventListener("click", function(){ escolhe("j", this); });
  document.getElementById("chip-l").addEventListener("click", function(){ escolhe("l", this); });
  function escolhe(t, el){
    tribo = t;
    document.getElementById("chip-j").setAttribute("aria-pressed", String(t === "j"));
    document.getElementById("chip-l").setAttribute("aria-pressed", String(t === "l"));
    document.getElementById("btn-comecar").disabled = false;
  }

  document.getElementById("btn-comecar").addEventListener("click", function(){
    ordem = embaralha(PERGUNTAS).slice(0, 50);
    atual = 0; acertos = 0;
    document.getElementById("quiz-inicio").hidden = true;
    document.getElementById("quiz-fim").hidden = true;
    document.getElementById("quiz-jogo").hidden = false;
    mostra();
  });

  function mostra(){
    var p = ordem[atual];
    document.getElementById("progresso").textContent = "pergunta " + (atual + 1) + " de " + ordem.length;
    document.getElementById("pergunta").textContent = p.q;
    document.getElementById("feedback").textContent = "";
    document.getElementById("btn-proxima").hidden = true;

    var certa = p.a[p.c];
    var alts = embaralha(p.a);
    var caixa = document.getElementById("alternativas");
    caixa.innerHTML = "";
    alts.forEach(function(txt){
      var b = document.createElement("button");
      b.className = "alt"; b.type = "button"; b.textContent = txt;
      b.addEventListener("click", function(){
        Array.prototype.forEach.call(caixa.children, function(x){
          x.disabled = true;
          if(x.textContent === certa) x.classList.add("certa");
        });
        if(txt === certa){ acertos++; }
        else{ b.classList.add("errada"); }
        document.getElementById("feedback").textContent =
          (txt === certa ? "Isso. " : "Era " + certa + ". ") + p.e;
        document.getElementById("btn-proxima").hidden = false;
        document.getElementById("btn-proxima").textContent = (atual === ordem.length - 1) ? "Ver resultado" : "Próxima";
        document.getElementById("btn-proxima").focus();
      });
      caixa.appendChild(b);
    });
  }

  document.getElementById("btn-proxima").addEventListener("click", function(){
    atual++;
    if(atual < ordem.length){ mostra(); return; }
    document.getElementById("quiz-jogo").hidden = true;
    var fim = document.getElementById("quiz-fim");
    fim.hidden = false;
    document.getElementById("acertos").textContent = acertos + "/" + ordem.length;
    var nome = tribo === "j" ? "Judá" : "Levi";
    var txt;
    if(acertos === ordem.length) txt = "" + ordem.length + " de " + ordem.length + ". " + nome + " leva " + (acertos * 10) + " pontos com você.";
    else if(acertos >= Math.ceil(ordem.length * 0.7)) txt = "Boa. Isso vale " + (acertos * 10) + " pontos para " + nome + ".";
    else if(acertos >= Math.ceil(ordem.length * 0.4)) txt = acertos * 10 + " pontos para " + nome + ". Dá pra melhorar até domingo.";
    else txt = "Só " + acertos * 10 + " pontos para " + nome + ". Abre a Bíblia e volta aqui.";
    document.getElementById("veredito").textContent = txt;
  });

  document.getElementById("btn-refazer").addEventListener("click", function(){
    document.getElementById("quiz-fim").hidden = true;
    document.getElementById("quiz-inicio").hidden = false;
  });
  ligarJovens();
  prepararCadastroJovem();
})();