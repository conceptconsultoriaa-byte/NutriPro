function contrastInk(hex){
  const num = parseInt(hex.slice(1),16);
  const r=(num>>16)&255, g=(num>>8)&255, b=num&255;
  const brightness = (r*299 + g*587 + b*114) / 1000;
  return brightness > 150 ? "#101010" : "#F5F5EF";
}

const card = document.getElementById("diarioCard");
const params = new URLSearchParams(window.location.search);
const pacienteId = params.get("id");

function renderMensagem(titulo, texto){
  card.innerHTML = `<h1>${titulo}</h1><p class="hint">${texto}</p>`;
}

let INFO = null;

async function iniciar(){
  if(!pacienteId){ renderMensagem("Link inválido", "Este link não é válido."); return; }

  const { data, error } = await supabaseClient.rpc("get_paciente_publico", { p_id: pacienteId }).maybeSingle();
  if(error || !data){ renderMensagem("Paciente não encontrado", "Verifique se o link está correto."); return; }
  INFO = data;

  if(INFO.business_cor){
    document.documentElement.style.setProperty("--lime", INFO.business_cor);
    document.documentElement.style.setProperty("--lime-ink", contrastInk(INFO.business_cor));
  }

  renderFormulario();
}

function renderFormulario(){
  card.innerHTML = `
    ${INFO.business_logo ? `<img src="${INFO.business_logo}" alt="${INFO.business_nome}" style="max-height:44px;margin-bottom:10px;">` : ""}
    <h1>Diário Alimentar</h1>
    <p class="hint">Olá, ${INFO.paciente_nome}! Envie a foto da sua refeição para ${INFO.business_nome} acompanhar.</p>
    <form id="diarioForm" class="auth-form">
      <label>Foto da refeição <input type="file" id="fotoInput" accept="image/*" capture="environment" required></label>
      <label>Observação (opcional) <input type="text" id="notaInput" placeholder="Ex: café da manhã, comi fora..."></label>
      <button type="submit" class="btn-primary">Enviar foto</button>
    </form>
    <p id="diarioMsg" class="hint"></p>
    ${INFO.business_whatsapp ? `<a class="btn-secondary" style="display:block;text-align:center;margin-top:14px;text-decoration:none;" href="https://wa.me/${INFO.business_whatsapp.replace(/\D/g,"")}" target="_blank" rel="noopener">💬 Fale com ${INFO.business_nome} agora</a>` : ""}
  `;

  document.getElementById("diarioForm").addEventListener("submit", enviarFoto);
}

async function enviarFoto(e){
  e.preventDefault();
  const file = document.getElementById("fotoInput").files[0];
  const nota = document.getElementById("notaInput").value.trim();
  const msg = document.getElementById("diarioMsg");
  if(!file){ msg.textContent = "Escolha uma foto primeiro."; return; }

  const btn = e.target.querySelector("button");
  btn.disabled = true;
  msg.textContent = "Enviando...";

  const path = `diario/${pacienteId}/${Date.now()}-${file.name}`;
  const { error: upErr } = await supabaseClient.storage.from("logos").upload(path, file);
  if(upErr){ msg.textContent = "Erro ao enviar a foto: " + upErr.message; btn.disabled = false; return; }
  const { data: pub } = supabaseClient.storage.from("logos").getPublicUrl(path);

  const { error } = await supabaseClient.rpc("registrar_diario_foto", { p_paciente_id: pacienteId, p_foto_url: pub.publicUrl, p_nota: nota || null });
  if(error){ msg.textContent = "Erro ao registrar: " + error.message; btn.disabled = false; return; }

  renderMensagem("Foto enviada! ✅", `Obrigado! ${INFO.business_nome} já pode ver sua refeição. Pode voltar aqui sempre que comer algo novo.`);
}

iniciar();
