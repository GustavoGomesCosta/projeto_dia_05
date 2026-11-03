// Chaves que identificam, neste navegador, os candidatos e os votos salvos.
    const STORAGE_KEYS = {
      candidates: "votasim-candidatos-v1",
      votes: "votasim-votos-v1"
    };

    // Imagem vetorial local usada quando o cadastro não tem foto ou a URL falha.
    const FALLBACK_IMAGE = "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="400" viewBox="0 0 320 400"><rect width="320" height="400" fill="#E8ECFF"/><circle cx="160" cy="135" r="66" fill="#1D3ECF" opacity=".72"/><path d="M45 370c10-86 55-129 115-129s105 43 115 129" fill="#1D3ECF" opacity=".72"/><text x="160" y="385" text-anchor="middle" font-family="Arial,sans-serif" font-size="16" fill="#20233A">Sem foto</text></svg>'
    );

    // Guarda as referências dos elementos para que os eventos atualizem a interface.
    const candidateForm = document.querySelector("#candidate-form");
    const candidateList = document.querySelector("#candidate-list");
    const registrationStatus = document.querySelector("#registration-status");
    const voteForm = document.querySelector("#vote-form");
    const voteNumber = document.querySelector("#vote-number");
    const voteButton = document.querySelector("#vote-button");
    const votePreview = document.querySelector("#vote-preview");
    const voteStatus = document.querySelector("#vote-status");
    const viewLinks = document.querySelectorAll("[data-view-link]");
    const views = document.querySelectorAll("[data-view]");

    // Carrega registros do armazenamento local e informa erros de leitura claramente.
    function readStoredArray(key, description) {
      const savedValue = localStorage.getItem(key);
      if (savedValue === null) {
        return [];
      }

      try {
        const parsedValue = JSON.parse(savedValue);
        if (!Array.isArray(parsedValue)) {
          throw new Error("O conteúdo salvo não é uma lista.");
        }
        return parsedValue;
      } catch (error) {
        console.error(`Não foi possível carregar ${description} do armazenamento local.`, error);
        showMessage(
          description === "candidatos" ? registrationStatus : voteStatus,
          `Não foi possível carregar ${description} salvos. Os dados armazenados estão inválidos.`,
          "error"
        );
        return [];
      }
    }

    // Mantém os candidatos e os totais de votos entre visitas neste mesmo navegador.
    let candidates = readStoredArray(STORAGE_KEYS.candidates, "candidatos");
    let votes = readStoredArray(STORAGE_KEYS.votes, "votos");

    // Salva uma lista e notifica a interface se o navegador bloquear o armazenamento.
    function saveStoredArray(key, value, statusElement, description) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (error) {
        console.error(`Não foi possível salvar ${description} no armazenamento local.`, error);
        showMessage(statusElement, `Não foi possível salvar ${description} neste navegador.`, "error");
        return false;
      }
    }

    // Atualiza mensagens de estado de forma acessível e remove estados antigos.
    function showMessage(element, message, type) {
      element.textContent = message;
      if (type) {
        element.dataset.type = type;
      } else {
        delete element.dataset.type;
      }
    }

    // Cria elementos de texto com textContent, evitando interpretar dados como HTML.
    function createTextElement(tagName, className, text) {
      const element = document.createElement(tagName);
      element.className = className;
      element.textContent = text;
      return element;
    }

    // Cria uma imagem com alternativa segura em caso de URL ausente ou indisponível.
    function createCandidateImage(candidate, className) {
      const image = document.createElement("img");
      image.className = className;
      image.src = candidate.photo || FALLBACK_IMAGE;
      image.alt = candidate.photo ? `Foto de ${candidate.name}` : `Imagem padrão de ${candidate.name}`;
      image.loading = "lazy";
      image.addEventListener("error", () => {
        image.src = FALLBACK_IMAGE;
      }, { once: true });
      return image;
    }

    // Busca o total de votos do candidato e devolve zero se ainda não houver votos.
    function getVoteCount(candidateNumber) {
      const record = votes.find((entry) => entry.candidateNumber === candidateNumber);
      return record ? record.count : 0;
    }

    // Monta um cartão completo, usado tanto na lista como na prévia de votação.
    function createCandidateDetails(candidate, includeVotes) {
      const details = document.createElement("div");
      details.append(
        createTextElement("h4", "", candidate.name),
        createTextElement("span", "numero-candidato", `Número ${candidate.number}`),
        createTextElement("p", "descricao-candidato", candidate.description || "Sem descrição informada.")
      );
      if (includeVotes) {
        details.append(createTextElement("p", "descricao-candidato", `Votos: ${getVoteCount(candidate.number)}`));

        const deleteButton = createTextElement("button", "botao-excluir-candidato", "Excluir candidato");
        deleteButton.type = "button";
        deleteButton.dataset.excluirCandidato = String(candidate.number);
        details.append(deleteButton);
      }
      return details;
    }

    // Renderiza novamente os cartões quando a lista ou a contagem de votos muda.
    function renderCandidates() {
      candidateList.replaceChildren();
      if (candidates.length === 0) {
        const emptyState = createTextElement(
          "p",
          "estado-vazio",
          "Ainda não há candidatos cadastrados. Use o formulário abaixo para adicionar o primeiro."
        );
        candidateList.append(emptyState);
        return;
      }

      const orderedCandidates = [...candidates].sort((first, second) => first.number - second.number);
      for (const candidate of orderedCandidates) {
        const card = document.createElement("article");
        card.className = "cartao-candidato";
        card.append(createCandidateImage(candidate, ""), createCandidateDetails(candidate, true));
        candidateList.append(card);
      }
    }

    // Atualiza a prévia ao digitar e só habilita o voto para um candidato existente.
    function updateVotePreview() {
      const enteredNumber = voteNumber.valueAsNumber;
      const candidate = candidates.find((entry) => entry.number === enteredNumber);
      votePreview.replaceChildren();
      voteButton.disabled = !candidate;

      if (!candidate) {
        const placeholder = document.createElement("div");
        placeholder.className = "mensagem-previa";
        placeholder.append(
          createTextElement("span", "icone-previa", "◉"),
          createTextElement(
            "p",
            "",
            voteNumber.value
              ? "Nenhum candidato encontrado com esse número. Confira o número e tente novamente."
              : "Digite um número válido para ver a foto e os dados do candidato aqui."
          )
        );
        votePreview.append(placeholder);
        return;
      }

      const preview = document.createElement("div");
      preview.className = "previa-candidato";
      preview.append(createCandidateImage(candidate, ""), createCandidateDetails(candidate, false));
      votePreview.append(preview);
    }

    // Troca as telas e atualiza o fragmento da URL para permitir links diretos.
    function showView(viewName, updateAddress = true) {
      const viewExists = [...views].some((view) => view.dataset.view === viewName);
      const selectedView = viewExists ? viewName : "inicio";

      for (const view of views) {
        view.hidden = view.dataset.view !== selectedView;
      }
      for (const link of viewLinks) {
        if (link.dataset.viewLink === selectedView) {
          link.setAttribute("aria-current", "page");
        } else {
          link.removeAttribute("aria-current");
        }
      }
      if (updateAddress && window.location.hash !== `#${selectedView}`) {
        window.history.replaceState(null, "", `#${selectedView}`);
      }
    }

    // Cadastra um candidato após validar campos obrigatórios e unicidade do número.
    candidateForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const formData = new FormData(candidateForm);
      const name = String(formData.get("nome") || "").trim();
      const number = Number(formData.get("numero"));
      const photo = String(formData.get("imagem") || "").trim();
      const description = String(formData.get("descricao") || "").trim();

      if (!name) {
        showMessage(registrationStatus, "Informe o nome do candidato.", "error");
        candidateForm.elements.nome.focus();
        return;
      }
      if (!Number.isInteger(number) || number <= 0) {
        showMessage(registrationStatus, "O número deve ser um inteiro maior que zero.", "error");
        candidateForm.elements.numero.focus();
        return;
      }
      if (candidates.some((candidate) => candidate.number === number)) {
        showMessage(registrationStatus, "Esse número já está cadastrado. Escolha outro número.", "error");
        candidateForm.elements.numero.focus();
        return;
      }

      const candidate = { name, number, photo, description };
      const updatedCandidates = [...candidates, candidate];
      if (!saveStoredArray(STORAGE_KEYS.candidates, updatedCandidates, registrationStatus, "o candidato")) {
        return;
      }

      candidates = updatedCandidates;
      candidateForm.reset();
      showMessage(registrationStatus, `${name} foi cadastrado com sucesso.`, "success");
      renderCandidates();
      updateVotePreview();
    });

    // Pede confirmação, remove o candidato e seus votos e atualiza lista e prévia.
    candidateList.addEventListener("click", (event) => {
      if (!(event.target instanceof Element)) {
        return;
      }

      const deleteButton = event.target.closest("[data-excluir-candidato]");
      if (!deleteButton) {
        return;
      }

      const number = Number(deleteButton.dataset.excluirCandidato);
      const candidate = candidates.find((entry) => entry.number === number);
      if (!candidate) {
        showMessage(registrationStatus, "Não foi possível encontrar esse candidato para excluir.", "error");
        return;
      }

      const confirmed = window.confirm(
        `Tem certeza que deseja excluir o candidato ${candidate.name} (número ${candidate.number})? Essa ação também apagará os votos registrados para ele.`
      );
      if (!confirmed) {
        return;
      }

      const updatedCandidates = candidates.filter((entry) => entry.number !== number);
      const updatedVotes = votes.filter((entry) => entry.candidateNumber !== number);

      if (!saveStoredArray(STORAGE_KEYS.candidates, updatedCandidates, registrationStatus, "a exclusão do candidato")) {
        return;
      }
      if (!saveStoredArray(STORAGE_KEYS.votes, updatedVotes, registrationStatus, "a exclusão dos votos")) {
        const rollbackSucceeded = saveStoredArray(
          STORAGE_KEYS.candidates,
          candidates,
          registrationStatus,
          "a restauração do candidato"
        );
        if (!rollbackSucceeded) {
          console.error("Não foi possível restaurar o cadastro após uma falha ao excluir os votos.");
        }
        return;
      }

      candidates = updatedCandidates;
      votes = updatedVotes;
      showMessage(registrationStatus, `${candidate.name} e seus votos foram excluídos.`, "success");
      renderCandidates();
      updateVotePreview();
    });

    // Atualiza a prévia sem recarregar a página enquanto a pessoa digita o número.
    voteNumber.addEventListener("input", () => {
      showMessage(voteStatus, "");
      updateVotePreview();
    });

    // Registra um voto para um candidato existente e atualiza a contagem exibida.
    voteForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const number = voteNumber.valueAsNumber;
      const candidate = candidates.find((entry) => entry.number === number);

      if (!Number.isInteger(number) || number <= 0 || !candidate) {
        showMessage(voteStatus, "Informe o número inteiro de um candidato cadastrado.", "error");
        updateVotePreview();
        voteNumber.focus();
        return;
      }

      const currentRecord = votes.find((entry) => entry.candidateNumber === number);
      const updatedVotes = currentRecord
        ? votes.map((entry) => entry.candidateNumber === number
          ? { ...entry, count: entry.count + 1 }
          : entry)
        : [...votes, { candidateNumber: number, count: 1 }];

      if (!saveStoredArray(STORAGE_KEYS.votes, updatedVotes, voteStatus, "o voto")) {
        return;
      }

      votes = updatedVotes;
      showMessage(voteStatus, `Voto confirmado para ${candidate.name}. Total registrado: ${getVoteCount(number)}.`, "success");
      renderCandidates();
    });

    // Permite alternar as telas pelos links e acompanha mudanças no endereço.
    for (const link of viewLinks) {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        showView(link.dataset.viewLink);
      });
    }
    window.addEventListener("hashchange", () => {
      showView(window.location.hash.slice(1), false);
    });

    // Desenha o estado inicial, recuperado do navegador, e abre a tela indicada na URL.
    renderCandidates();
    updateVotePreview();
    showView(window.location.hash.slice(1) || "inicio", false);
