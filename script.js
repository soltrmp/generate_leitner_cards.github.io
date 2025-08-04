// script.js
let flashcards = [];

// event listener load pour inclure le chargement des fichiers
window.addEventListener("load", async () => {
  await fetchCSVFiles(); // Charger la liste des fichiers CSV disponibles
  
  // Charger flashcards.csv par défaut si disponible
  try {
    const defaultFile = 'flashcards.csv';
    const selector = document.getElementById('csv-selector');
    if (Array.from(selector.options).some(opt => opt.value === defaultFile)) {
      selector.value = defaultFile;
      await loadSelectedCSV(defaultFile);
    }
  } catch (err) {
    console.warn("Fichier par défaut non trouvé");
  }
});

// Ajoutez cette fonction pour charger le fichier sélectionné
async function loadSelectedCSV(filename) {
  try {
    const response = await fetch(filename);
    if (response.ok) {
      const csv = await response.text();
      parseCSV(csv);
      renderFlashcards();
    }
  } catch (err) {
    console.error(`Erreur lors du chargement de ${filename}:`, err);
    alert(`Impossible de charger ${filename}`);
  }
}

// Ajoutez cet event listener pour le bouton de chargement
document.getElementById("load-btn").addEventListener("click", async () => {
  const filename = document.getElementById("csv-selector").value;
  if (filename) {
    await loadSelectedCSV(filename);
  } else {
    alert("Veuillez sélectionner un fichier");
  }
});

// Parser le CSV
function parseCSV(csv) {
  flashcards = []; // Vider le tableau avant de charger
  flashcards = csv
    .split("\n")
    .slice(1)
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => {
      const match = line.match(/(".*?"|[^,]*),(".*?"|[^,]*),(".*?"|[^,]*),(".*?"|[^,]*),(".*?"|[^,]*),(".*?"|[^,]*)/);
      if (!match) return null;
      return {
        question_content: cleanCSVField(match[1]),
        question_content_image: cleanCSVField(match[2]),
        answer_content: cleanCSVField(match[3]),
        answer_content_image: cleanCSVField(match[4]),
        box_number: parseInt(match[5]) || 1,
        last_reviewed: cleanCSVField(match[6])
      };
    })
    .filter(Boolean);
}


// Ajoutez cette fonction au début de script.js
async function fetchCSVFiles() {
  try {
    // Utilisation de l'API GitHub pour lister les fichiers
    const response = await fetch('https://api.github.com/repos/soltrmp/generate_leitner_cards.github.io/contents/');
    if (response.ok) {
      const files = await response.json();
      const csvFiles = files.filter(file => file.name.endsWith('.csv'));
      const selector = document.getElementById('csv-selector');
      
      // Vider et remplir le sélecteur
      selector.innerHTML = '<option value="">Sélectionnez un fichier...</option>';
      csvFiles.forEach(file => {
        const option = document.createElement('option');
        option.value = file.name;
        option.textContent = file.name;
        selector.appendChild(option);
      });
    }
  } catch (err) {
    console.error("Erreur lors du chargement de la liste des fichiers:", err);
  }
}


function cleanCSVField(field) {
  return field.replace(/^"(.*)"$/, "$1").replace(/""/g, '"');
}

// Générer CSV
function generateCSV() {
  const today = new Date().toISOString().split("T")[0];
  const header = "question_content,question_content_image,answer_content,answer_content_image,box_number,last_reviewed";
  const rows = flashcards.map(card => {
    // Mise à jour de la date à l’export
    card.last_reviewed = today;
    return [
      `"${card.question_content.replace(/"/g, '""')}"`,
      `"${card.question_content_image}"`,
      `"${card.answer_content.replace(/"/g, '""')}"`,
      `"${card.answer_content_image}"`,
      card.box_number,
      `"${card.last_reviewed}"`
    ].join(",");
  });
  return [header, ...rows].join("\n");
}

// Exporter CSV
document.getElementById("export-btn").addEventListener("click", () => {
  const filename = document.getElementById("filename").value.trim() || "flashcards.csv";
  const csv = generateCSV();
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
});

// Gestion des fichiers image
document.getElementById("browse-question-img").onclick = () => {
  document.getElementById("question_image_input").click();
};
document.getElementById("browse-answer-img").onclick = () => {
  document.getElementById("answer_image_input").click();
};

// Afficher le nom du fichier sélectionné
["question", "answer"].forEach(type => {
  const input = document.getElementById(`${type}_image_input`);
  input.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      const folder = input.dataset.folder;
      document.getElementById(`${type}-img-name`).textContent = `${folder}/${file.name}`;
    }
  });
});

// Ajouter une nouvelle flashcard
document.getElementById("flashcard-form").addEventListener("submit", (e) => {
  e.preventDefault();

  const qText = document.getElementById("question_content").value.trim();
  const aText = document.getElementById("answer_content").value.trim();
  const qImg = document.getElementById("question-img-name").textContent.includes("/") 
    ? document.getElementById("question-img-name").textContent : "";
  const aImg = document.getElementById("answer-img-name").textContent.includes("/") 
    ? document.getElementById("answer-img-name").textContent : "";

  flashcards.push({
    question_content: qText,
    question_content_image: qImg,
    answer_content: aText,
    answer_content_image: aImg,
    box_number: 1,
    last_reviewed: new Date().toISOString().split("T")[0]
  });

  // Réinitialiser
  document.getElementById("flashcard-form").reset();
  document.getElementById("question-img-name").textContent = "Aucun fichier";
  document.getElementById("answer-img-name").textContent = "Aucun fichier";

  renderFlashcards();
});

// ... (le reste du script.js inchangé jusqu'à deleteCard)

// Supprimer une flashcard + indiquer les images à supprimer manuellement
function deleteCard(index) {
  const card = flashcards[index];
  const filesToDelete = [];

  if (card.question_content_image) {
    filesToDelete.push(card.question_content_image);
  }
  if (card.answer_content_image) {
    filesToDelete.push(card.answer_content_image);
  }

  let message = `Supprimer cette flashcard ?`;
  if (filesToDelete.length > 0) {
    message += `\n\nLes fichiers suivants NE SERONT PAS supprimés automatiquement :\n${filesToDelete.join("\n")}\n\n👉 Veuillez les supprimer manuellement dans votre dossier.`;
  }

  const confirmDelete = confirm(message);
  if (!confirmDelete) return;

  // Supprimer la carte de la mémoire
  flashcards.splice(index, 1);
  renderFlashcards();

  // Si des fichiers existent, afficher une alerte persistante avec copie
  if (filesToDelete.length > 0) {
    alert(`📌 Supprimez manuellement ces fichiers :\n\n${filesToDelete.join("\n")}\n\nOu cliquez sur "Copier" ci-dessous pour copier les chemins.`);
    showDeleteHelper(filesToDelete);
  } else {
    alert("Flashcard supprimée.");
  }
}

// Affiche un petit panneau d'aide avec bouton "Copier"
function showDeleteHelper(filePaths) {
  const container = document.getElementById("flashcards-list");
  const helperId = "delete-helper";

  // Ne pas ajouter plusieurs fois
  if (document.getElementById(helperId)) return;

  const helper = document.createElement("div");
  helper.id = helperId;
  helper.className = "bg-red-50 border-l-4 border-red-400 p-4 rounded mb-4";
  helper.innerHTML = `
    <div class="flex items-start">
      <div class="ml-3">
        <p class="text-sm text-red-700">
          <strong>Supprimez manuellement ces fichiers :</strong>
        </p>
        <code class="block bg-red-100 p-2 mt-1 text-xs rounded text-red-800 max-h-24 overflow-y-auto font-mono">
          ${filePaths.map(p => p).join("<br>")}
        </code>
        <button id="copy-paths-btn" class="mt-2 text-xs px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700">
          🔖 Copier les chemins
        </button>
      </div>
    </div>
  `;
  container.before(helper);

  // Copier les chemins
  document.getElementById("copy-paths-btn").addEventListener("click", () => {
    const textToCopy = filePaths.join("\n");
    navigator.clipboard.writeText(textToCopy).then(() => {
      alert("✅ Chemins copiés dans le presse-papiers.\n\nAllez dans le dossier et supprimez les fichiers.");
      document.getElementById(helperId).remove();
    }).catch(err => {
      console.error("Échec de la copie :", err);
      alert("❌ Impossible de copier (navigateur incompatible).");
    });
  });
}


// Sauvegarder les modifications en direct
function saveCard(index, field, value) {
  flashcards[index][field] = value;
}

// Générer l’éditeur de carte
function renderEditableCard(card, index) {
  return `
    <div class="border p-5 rounded card-hover bg-gray-50 space-y-4">
      <!-- Question -->
      <div class="grid md:grid-cols-2 gap-6">
        <div class="space-y-3">
          <label class="block font-medium text-indigo-700">Question (texte)</label>
          <textarea class="w-full p-2 border rounded text-sm" rows="2"
            oninput="saveCard(${index}, 'question_content', this.value)"
          >${card.question_content}</textarea>

          <label class="block font-medium text-indigo-700">Image</label>
          <div class="flex items-center space-x-2 mb-2">
            <button type="button" onclick="browseImage(${index}, 'question')" 
              class="text-xs px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600">
              Parcourir
            </button>
            <span class="text-xs text-gray-500" id="edit-q-img-${index}">
              ${card.question_content_image ? card.question_content_image.split('/').pop() : "Aucune"}
            </span>
          </div>
          <div class="img-container">
            ${card.question_content_image ? 
              `<img src="${card.question_content_image}" alt="Question" onerror="this.remove()" />` : 
              `<span class="text-gray-400 text-sm">Pas d'image</span>`
            }
          </div>
        </div>

        <!-- Réponse -->
        <div class="space-y-3">
          <label class="block font-medium text-green-700">Réponse (texte)</label>
          <textarea class="w-full p-2 border rounded text-sm" rows="3"
            oninput="saveCard(${index}, 'answer_content', this.value)"
          >${card.answer_content}</textarea>

          <label class="block font-medium text-green-700">Image</label>
          <div class="flex items-center space-x-2 mb-2">
            <button type="button" onclick="browseImage(${index}, 'answer')" 
              class="text-xs px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600">
              Parcourir
            </button>
            <span class="text-xs text-gray-500" id="edit-a-img-${index}">
              ${card.answer_content_image ? card.answer_content_image.split('/').pop() : "Aucune"}
            </span>
          </div>
          <div class="img-container">
            ${card.answer_content_image ? 
              `<img src="${card.answer_content_image}" alt="Réponse" onerror="this.remove()" />` : 
              `<span class="text-gray-400 text-sm">Pas d'image</span>`
            }
          </div>
        </div>
      </div>

      <!-- Contrôles -->
      <div class="flex flex-wrap gap-2 pt-2 text-sm text-gray-600">
        <span>Boîte: ${card.box_number}</span>
        <span>| Dernière révision: ${card.last_reviewed}</span>
        <button onclick="deleteCard(${index})" 
          class="ml-auto text-red-500 hover:text-red-700 text-xs font-semibold">
          🗑️ Supprimer
        </button>
      </div>
    </div>
  `;
}


// Ouvrir le sélecteur de fichier pour une carte
// Modifiez la fonction browseImage pour gérer les sous-répertoires
function browseImage(cardIndex, type) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.webkitdirectory = true; // Permet la sélection de répertoire
  input.directory = true;
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const folder = type === "question" ? "images_questions" : "images_answers";
      // Garder la structure de sous-répertoire
      const relativePath = file.webkitRelativePath || 
                         `${folder}/${file.name}`;
      const pathParts = relativePath.split('/');
      // Enlever le premier dossier (images_questions ou images_answers)
      const finalPath = pathParts.slice(1).join('/');
      const fullPath = `${folder}/${finalPath}`;
      
      flashcards[cardIndex][type === "question" ? "question_content_image" : "answer_content_image"] = fullPath;
      document.getElementById(`edit-${type[0]}-img-${cardIndex}`).textContent = fullPath;
      renderFlashcards();
    }
  };
  input.click();
}
// Afficher toutes les flashcards
function renderFlashcards() {
  const container = document.getElementById("flashcards-list");
  if (flashcards.length === 0) {
    container.innerHTML = "<p class='text-gray-500'>Aucune flashcard. Ajoutez-en une !</p>";
    return;
  }

  container.innerHTML = flashcards.map((card, i) => renderEditableCard(card, i)).join("");
}

// Accordéon
document.getElementById("toggle-instructions").addEventListener("click", () => {
  document.getElementById("instructions").classList.toggle("hidden");
});