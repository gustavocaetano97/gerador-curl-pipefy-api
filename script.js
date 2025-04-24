document.addEventListener('DOMContentLoaded', function() {
  // Elementos DOM
  const resourceBtns = document.querySelectorAll('.resource-btn');
  const operationContainers = document.querySelectorAll('.operation-container');
  const operationBtns = document.querySelectorAll('.operation-btn');
  const paramsForm = document.getElementById('params-form');
  const curlOutput = document.getElementById('curl-output');
  const copyBtn = document.getElementById('copy-btn');
  const executeBtn = document.getElementById('execute-btn');
  const responseContainer = document.querySelector('.response-container');
  const responseOutput = document.getElementById('response-output');
  const copyResponseBtn = document.getElementById('copy-response-btn');
  const apiTokenInput = document.getElementById('api-token');
  const saveTokenBtn = document.getElementById('save-token');
  const defaultOrgId = document.getElementById('default-org-id');
  const defaultPipeId = document.getElementById('default-pipe-id');
  const saveIdsBtn = document.getElementById('save-ids');
  
  // Estado atual
  let currentResource = 'pipes';
  let currentOperation = null;
  let currentQuery = '';
  
  // Carregar token salvo
  apiTokenInput.value = localStorage.getItem('pipefy_api_token') || '';
  
  // Carregar IDs salvos
  defaultOrgId.value = localStorage.getItem('pipefy_org_id') || '';
  defaultPipeId.value = localStorage.getItem('pipefy_pipe_id') || '';
  
  // Salvar token
  saveTokenBtn.addEventListener('click', function() {
      const token = apiTokenInput.value.trim();
      if (token) {
          localStorage.setItem('pipefy_api_token', token);
          alert('Token salvo com sucesso!');
          
          // Se já existe um comando curl gerado, atualizá-lo com o novo token
          if (currentQuery) {
              updateCurlWithToken();
          }
      } else {
          alert('Por favor, insira um token válido.');
      }
  });
  
  // Salvar IDs padrão
  saveIdsBtn.addEventListener('click', function() {
      const orgId = defaultOrgId.value.trim();
      const pipeId = defaultPipeId.value.trim();
      
      localStorage.setItem('pipefy_org_id', orgId);
      localStorage.setItem('pipefy_pipe_id', pipeId);
      
      alert('IDs salvos com sucesso!');
  });
  
  // Configuração dos parâmetros para cada operação
  const paramConfigs = {
      pipes: {
          list: [
              { name: 'organization_id', label: 'ID da Organização', type: 'text', required: true }
          ],
          get: [
              { name: 'id', label: 'ID do Pipe', type: 'text', required: true }
          ],
          create: [
              { name: 'organization_id', label: 'ID da Organização', type: 'text', required: true },
              { name: 'name', label: 'Nome do Pipe', type: 'text', required: true },
              { name: 'icon', label: 'Ícone', type: 'text', required: false }
          ],
          update: [
              { name: 'id', label: 'ID do Pipe', type: 'text', required: true },
              { name: 'name', label: 'Novo Nome', type: 'text', required: false },
              { name: 'icon', label: 'Novo Ícone', type: 'text', required: false }
          ],
          delete: [
              { name: 'id', label: 'ID do Pipe', type: 'text', required: true }
          ]
      },
      cards: {
          list: [
              { name: 'pipe_id', label: 'ID do Pipe', type: 'text', required: true }
          ],
          get: [
              { name: 'id', label: 'ID do Card', type: 'text', required: true }
          ],
          create: [
              { name: 'pipe_id', label: 'ID do Pipe', type: 'text', required: true },
              { name: 'fetch_fields', label: 'Buscar Campos do Pipe', type: 'button', buttonText: 'Carregar Campos' },
              { name: 'title', label: 'Título do Card', type: 'text', required: true },
              { name: 'fields', label: 'Campos (JSON)', type: 'textarea', required: false, placeholder: 'Clique em "Carregar Campos" para preencher automaticamente' }
          ],
          update: [
              { name: 'id', label: 'ID do Card', type: 'text', required: true },
              { name: 'title', label: 'Novo Título', type: 'text', required: false },
              { name: 'fields', label: 'Campos (JSON)', type: 'textarea', required: false, placeholder: '[\n  {\n    "field_id": "nome_do_campo",\n    "field_value": "valor_do_campo"\n  }\n]' }
          ],
          delete: [
              { name: 'id', label: 'ID do Card', type: 'text', required: true }
          ]
      },
      organizations: {
          list: [],
          get: [
              { name: 'id', label: 'ID da Organização', type: 'text', required: true }
          ],
          create: [
              { name: 'industry', label: 'Indústria', type: 'text', required: true },
              { name: 'name', label: 'Nome da Organização', type: 'text', required: true }
          ],
          update: [
              { name: 'id', label: 'ID da Organização', type: 'text', required: true },
              { name: 'name', label: 'Novo Nome', type: 'text', required: false }
          ]
      }
  };
  
  // Queries GraphQL para cada operação
  const graphqlQueries = {
      pipes: {
          list: `query {
organization(id: "{{organization_id}}") {
  pipes {
    id
    name
    phases {
      id
      name
    }
  }
}
}`,
          get: `query {
pipe(id: "{{id}}") {
  id
  name
  phases {
    id
    name
    fields {
      id
      name
      type
    }
  }
}
}`,
          create: `mutation {
createPipe(input: {
  organization_id: "{{organization_id}}",
  name: "{{name}}"
  {{#icon}}, icon: "{{icon}}"{{/icon}}
}) {
  pipe {
    id
    name
  }
}
}`,
          update: `mutation {
updatePipe(input: {
  id: "{{id}}"
  {{#name}}, name: "{{name}}"{{/name}}
  {{#icon}}, icon: "{{icon}}"{{/icon}}
}) {
  pipe {
    id
    name
  }
}
}`,
          delete: `mutation {
deletePipe(input: {
  id: "{{id}}"
}) {
  success
}
}`
      },
      cards: {
          list: `query {
  allCards(pipeId: "{{pipe_id}}", first: 100) {
    edges {
      node {
        id
        title
        createdAt
        current_phase {
          name
        }
        fields {
          name
          value
        }
      }
    }
  }
}`,
          get: `query {
  card(id: "{{id}}") {
    id
    title
    createdAt
    current_phase {
      name
    }
    fields {
      name
      value
    }
  }
}`,
          create: `mutation {
  createCard(input: {
    pipe_id: "{{pipe_id}}",
    title: "{{title}}"
    {{#fields}}, fields_attributes: {{fields}}{{/fields}}
  }) {
    card {
      id
      title
    }
  }
}`,
          update: `mutation {
  updateCard(input: {
    id: "{{id}}"
    {{#title}}, title: "{{title}}"{{/title}}
    {{#fields}}, fields_attributes: {{fields}}{{/fields}}
  }) {
    card {
      id
      title
    }
  }
}`,
          delete: `mutation {
  deleteCard(input: {
    id: "{{id}}"
  }) {
    success
  }
}`
      },
      organizations: {
          list: `query {
organizations {
  id
  name
  users {
    id
    name
    email
  }
}
}`,
          get: `query {
organization(id: "{{id}}") {
  id
  name
  users {
    id
    name
    email
  }
}
}`,
          create: `mutation {
createOrganization(input: {
  industry: "{{industry}}",
  name: "{{name}}"
}) {
  organization {
    id
    name
  }
}
}`,
          update: `mutation {
updateOrganization(input: {
  id: "{{id}}"
  {{#name}}, name: "{{name}}"{{/name}}
}) {
  organization {
    id
    name
  }
}
}`
      }
  };
  
  // Alternar entre recursos
  resourceBtns.forEach(btn => {
      btn.addEventListener('click', function() {
          const resource = this.dataset.resource;
          
          // Atualizar botões ativos
          resourceBtns.forEach(b => b.classList.remove('active'));
          this.classList.add('active');
          
          // Mostrar operações relevantes
          operationContainers.forEach(container => {
              container.style.display = 'none';
          });
          document.getElementById(`${resource}-operations`).style.display = 'flex';
          
          // Atualizar estado
          currentResource = resource;
          currentOperation = null;
          currentQuery = '';
          
          // Limpar formulário e saída
          paramsForm.innerHTML = '';
          curlOutput.textContent = 'Selecione uma operação para gerar o comando curl.';
          responseContainer.style.display = 'none';
          
          // Resetar botões de operação
          operationBtns.forEach(b => b.classList.remove('active'));
      });
  });
  
  // Selecionar operação
  operationBtns.forEach(btn => {
      btn.addEventListener('click', function() {
          const operation = this.dataset.operation;
          
          // Atualizar botões ativos
          operationBtns.forEach(b => b.classList.remove('active'));
          this.classList.add('active');
          
          // Atualizar estado
          currentOperation = operation;
          currentQuery = '';
          
          // Renderizar formulário de parâmetros
          renderParamsForm();
          
          // Esconder resposta anterior
          responseContainer.style.display = 'none';
      });
  });
  
  // Renderizar formulário de parâmetros
  function renderParamsForm() {
      if (!currentResource || !currentOperation) return;
      
      const params = paramConfigs[currentResource][currentOperation];
      
      let formHTML = '<form class="params-form">';
      
      params.forEach(param => {
          // Determinar valor padrão baseado no tipo de campo
          let defaultValue = '';
          if (param.name === 'organization_id') {
              defaultValue = defaultOrgId.value;
          } else if (param.name === 'pipe_id') {
              defaultValue = defaultPipeId.value;
          }
          
          formHTML += `
              <div class="param-group">
                  <label for="${param.name}">${param.label}${param.required ? ' *' : ''}</label>
                  ${param.type === 'textarea' 
                      ? `<textarea id="${param.name}" name="${param.name}" ${param.required ? 'required' : ''} placeholder="${param.placeholder || ''}"></textarea>` 
                      : param.type === 'button'
                          ? `<button type="button" id="${param.name}" class="fetch-fields-btn">${param.buttonText}</button>`
                          : `<input type="${param.type}" id="${param.name}" name="${param.name}" value="${defaultValue}" ${param.required ? 'required' : ''}>`
                  }
              </div>
          `;
      });
      
      formHTML += '<button type="submit" class="submit-btn">Gerar Curl</button></form>';
      
      paramsForm.innerHTML = formHTML;
      
      // Adicionar evento de submit
      document.querySelector('.params-form').addEventListener('submit', function(e) {
          e.preventDefault();
          generateCurl();
      });

      // Adicionar evento para o botão de carregar campos
      const fetchFieldsBtn = document.getElementById('fetch_fields');
      if (fetchFieldsBtn) {
          fetchFieldsBtn.addEventListener('click', async function() {
              const pipeId = document.getElementById('pipe_id').value;
              if (!pipeId) {
                  alert('Por favor, insira o ID do Pipe primeiro.');
                  return;
              }

              const token = apiTokenInput.value.trim();
              if (!token) {
                  alert('Por favor, insira um token de API válido.');
                  return;
              }

              // Mostrar indicador de carregamento no botão
              const originalText = fetchFieldsBtn.textContent;
              fetchFieldsBtn.textContent = 'Carregando...';
              fetchFieldsBtn.disabled = true;

              try {
                  // Query para buscar apenas os campos iniciais do pipe
                  const query = `query {
                      pipe(id: "${pipeId}") {
                          start_form_fields {
                              id
                              label
                              type
                              required
                              help
                              options
                          }
                      }
                  }`;

                  // Fazer a requisição
                  const response = await fetch('https://api.pipefy.com/graphql', {
                      method: 'POST',
                      headers: {
                          'Authorization': `Bearer ${token}`,
                          'Content-Type': 'application/json'
                      },
                      body: JSON.stringify({ query })
                  });

                  const data = await response.json();

                  if (data.errors) {
                      throw new Error(data.errors[0].message);
                  }

                  // Gerar template JSON para os campos iniciais
                  const fieldsTemplate = data.data.pipe.start_form_fields.map(field => {
                      let fieldComment = `// ${field.label} (${field.type})${field.required ? ' *' : ''}`;
                      if (field.help) {
                          fieldComment += `\n// Ajuda: ${field.help}`;
                      }
                      if (field.options && field.options.length > 0) {
                          fieldComment += `\n// Opções: ${field.options.join(', ')}`;
                      }

                      return {
                          field_id: field.id,
                          field_value: fieldComment
                      };
                  });

                  // Atualizar o campo de texto com os campos formatados
                  const fieldsTextarea = document.getElementById('fields');
                  fieldsTextarea.value = JSON.stringify(fieldsTemplate, null, 2);

              } catch (error) {
                  alert(`Erro ao carregar campos: ${error.message}`);
              } finally {
                  // Restaurar botão
                  fetchFieldsBtn.textContent = originalText;
                  fetchFieldsBtn.disabled = false;
              }
          });
      }
  }
  
  // Gerar comando curl
  function generateCurl() {
      const formData = new FormData(document.querySelector('.params-form'));
      const params = {};
      
      for (let [key, value] of formData.entries()) {
          params[key] = value;
      }
      
      // Obter a query GraphQL
      let query = graphqlQueries[currentResource][currentOperation];
      
      // Substituir placeholders
      for (const [key, value] of Object.entries(params)) {
          if (value) {
              // Substituir placeholders condicionais
              const conditionalRegex = new RegExp(`{{#${key}}}([\\s\\S]*?){{/${key}}}`, 'g');
              query = query.replace(conditionalRegex, '$1');
              
              // Substituir placeholders normais
              const regex = new RegExp(`{{${key}}}`, 'g');
              query = query.replace(regex, value);
          } else {
              // Remover blocos condicionais se o valor não estiver presente
              const conditionalRegex = new RegExp(`{{#${key}}}[\\s\\S]*?{{/${key}}}`, 'g');
              query = query.replace(conditionalRegex, '');
          }
      }
      
      // Remover quaisquer placeholders restantes
      query = query.replace(/{{[^}]+}}/g, '');
      
      // Salvar a query atual para uso na execução
      currentQuery = query;
      
      // Gerar o comando curl com o token se disponível
      updateCurlWithToken();
  }
  
  // Atualizar o comando curl com o token atual
  function updateCurlWithToken() {
      if (!currentQuery) return;
      
      const token = apiTokenInput.value.trim();
      const tokenPlaceholder = token ? token : 'SEU_TOKEN_AQUI';
      
      // Formatar o comando curl
      const curlCommand = `curl -X POST \\
https://api.pipefy.com/graphql \\
-H "Authorization: Bearer ${tokenPlaceholder}" \\
-H "Content-Type: application/json" \\
-d '{"query": "${currentQuery.replace(/\n/g, '\\n').replace(/"/g, '\\"')}"}'`;
      
      // Exibir o comando
      curlOutput.textContent = curlCommand;
  }
  
  // Executar requisição
  executeBtn.addEventListener('click', function() {
      if (!currentQuery) {
          alert('Por favor, gere um comando curl primeiro.');
          return;
      }
      
      const token = apiTokenInput.value.trim();
      if (!token) {
          alert('Por favor, insira um token de API válido.');
          return;
      }
      
      // Mostrar indicador de carregamento
      responseContainer.style.display = 'block';
      responseOutput.textContent = 'Executando requisição...';
      responseOutput.parentElement.classList.add('loading');
      
      // Preparar dados para a requisição
      const requestData = {
          query: currentQuery
      };
      
      // Fazer a requisição
      fetch('https://api.pipefy.com/graphql', {
          method: 'POST',
          headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestData)
      })
      .then(response => response.json())
      .then(data => {
          // Remover indicador de carregamento
          responseOutput.parentElement.classList.remove('loading');
          
          // Formatar e exibir a resposta
          responseOutput.textContent = JSON.stringify(data, null, 2);
      })
      .catch(error => {
          // Remover indicador de carregamento
          responseOutput.parentElement.classList.remove('loading');
          
          // Exibir erro
          responseOutput.textContent = `Erro ao executar requisição: ${error.message}`;
      });
  });
  
  // Copiar para a área de transferência (curl)
  copyBtn.addEventListener('click', function() {
      const textToCopy = curlOutput.textContent;
      
      navigator.clipboard.writeText(textToCopy)
          .then(() => {
              const originalText = copyBtn.textContent;
              copyBtn.textContent = 'Copiado!';
              
              setTimeout(() => {
                  copyBtn.textContent = originalText;
              }, 2000);
          })
          .catch(err => {
              console.error('Erro ao copiar: ', err);
          });
  });

  // Copiar para a área de transferência (resposta)
  copyResponseBtn.addEventListener('click', function() {
      const textToCopy = responseOutput.textContent;
      
      navigator.clipboard.writeText(textToCopy)
          .then(() => {
              const originalText = copyResponseBtn.textContent;
              copyResponseBtn.textContent = 'Copiado!';
              
              setTimeout(() => {
                  copyResponseBtn.textContent = originalText;
              }, 2000);
          })
          .catch(err => {
              console.error('Erro ao copiar: ', err);
          });
  });

  // Inicializar interface
  renderParamsForm();
});