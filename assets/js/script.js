document.addEventListener('DOMContentLoaded', () => {
  // Usuários válidos para autenticação.
  const USUARIOS_AUTORIZADOS = [
    {
      usuario: 'administrador',
      senha: 'admin123',
      email: 'admin@peganavara.com',
    },
  ];

  // Chaves usadas no sessionStorage.
  const CHAVES_ARMAZENAMENTO = Object.freeze({
    USUARIO_ATUAL: 'pnvCurrentUser',
    REDIRECIONAMENTO: 'pnvRedirectAfterLogin',
  });

  // Estado compartilhado entre as funções internas.
  const estado = {
    usuarioAtual: lerUsuarioAtual(),
  };

  // Referências de interface.
  const corpo = document.body;
  const botaoMenuMobile = document.getElementById('mobile-menu-btn');
  const menuNavegacao = document.getElementById('nav-menu');
  const linksNavegacao = menuNavegacao ? Array.from(menuNavegacao.querySelectorAll('a')) : [];
  const botoesLogin = Array.from(document.querySelectorAll('[data-auth-login]'));
  const botoesLogout = Array.from(document.querySelectorAll('[data-auth-logout]'));
  const formularioLogin = document.getElementById('login');
  const avisoLogin = document.querySelector('[data-auth-feedback="login"]');

  inicializarNavegacao();
  sincronizarInterfaceAutenticacao();

  if (redirecionarNaoAutorizado()) {
    return;
  }

  vincularEventosAutenticacao();
  exibirAvisoAreaRestrita();

  // Cria o menu mobile e garante o fechamento em interações comuns.
  function inicializarNavegacao() {
    if (!botaoMenuMobile || !menuNavegacao) {
      return;
    }

    const fecharMenu = () => {
      menuNavegacao.classList.remove('nav-menu--open');
      botaoMenuMobile.classList.remove('nav-toggle--active');
      botaoMenuMobile.setAttribute('aria-expanded', 'false');
      corpo.classList.remove('menu-open');
    };

    const alternarMenu = () => {
      const menuAberto = menuNavegacao.classList.toggle('nav-menu--open');
      botaoMenuMobile.classList.toggle('nav-toggle--active', menuAberto);
      botaoMenuMobile.setAttribute('aria-expanded', String(menuAberto));
      corpo.classList.toggle('menu-open', menuAberto);
    };

    botaoMenuMobile.addEventListener('click', alternarMenu);
    window.addEventListener('resize', () => {
      if (window.innerWidth > 768) {
        fecharMenu();
      }
    });
    document.addEventListener('keydown', (evento) => {
      if (evento.key === 'Escape') {
        fecharMenu();
      }
    });

    linksNavegacao.forEach((link) => {
      link.addEventListener('click', () => {
        if (window.innerWidth <= 768) {
          fecharMenu();
        }
      });
    });
  }

  // Liga os eventos de login e logout.
  function vincularEventosAutenticacao() {
    botoesLogout.forEach((botao) => {
      botao.addEventListener('click', () => {
        definirUsuarioAtual(null);
        sessionStorage.removeItem(CHAVES_ARMAZENAMENTO.REDIRECIONAMENTO);
        window.location.href = './index.html';
      });
    });

    if (formularioLogin) {
      formularioLogin.addEventListener('submit', processarLogin);
    }
  }

  // Ajusta visibilidade de botões conforme sessão.
  function sincronizarInterfaceAutenticacao() {
    const autenticado = Boolean(estado.usuarioAtual);

    botoesLogin.forEach((link) => ajustarVisibilidade(link, !autenticado));
    botoesLogout.forEach((botao) => ajustarVisibilidade(botao, autenticado));
  }

  // Impede acesso a páginas restritas sem login.
  function redirecionarNaoAutorizado() {
    const paginaProtegida = document.querySelector('[data-requires-auth="true"]');

    if (paginaProtegida && !estado.usuarioAtual) {
      const caminhoDestino = `./${window.location.pathname.split('/').pop()}`;
      sessionStorage.setItem(CHAVES_ARMAZENAMENTO.REDIRECIONAMENTO, caminhoDestino);
      window.location.href = './login.html?from=protected';
      return true;
    }

    return false;
  }

  // Mostra aviso quando o usuário veio de uma página protegida.
  function exibirAvisoAreaRestrita() {
    if (!formularioLogin || !avisoLogin) {
      return;
    }

    const parametros = new URLSearchParams(window.location.search);

    if (parametros.get('from') === 'protected') {
      atualizarAviso('Faça login para acessar a área restrita.', 'error');
    }
  }

  // Valida credenciais e cria a sessão em caso de sucesso.
  function processarLogin(evento) {
    evento.preventDefault();
    atualizarAviso('');

    const dadosFormulario = new FormData(formularioLogin);
    const usuario = String(dadosFormulario.get('loginName') || '').trim().toLowerCase();
    const senha = String(dadosFormulario.get('loginPassword') || '').trim();

    if (!usuario || !senha) {
      atualizarAviso('Informe usuário e senha para continuar.', 'error');
      return;
    }

    const registro = USUARIOS_AUTORIZADOS.find((entrada) => entrada.usuario.toLowerCase() === usuario);

    if (!registro || registro.senha !== senha) {
      atualizarAviso('Credenciais inválidas. Verifique os dados e tente novamente.', 'error');
      return;
    }

    definirUsuarioAtual({ usuario: registro.usuario, email: registro.email });
    atualizarAviso('Login realizado! Redirecionando...', 'success');
    formularioLogin.reset();

    const destino = sessionStorage.getItem(CHAVES_ARMAZENAMENTO.REDIRECIONAMENTO) || './index.html';
    sessionStorage.removeItem(CHAVES_ARMAZENAMENTO.REDIRECIONAMENTO);

    window.setTimeout(() => {
      window.location.href = destino === './login.html' ? './index.html' : destino;
    }, 600);
  }

  // Persiste ou remove o usuário atual e atualiza a interface.
  function definirUsuarioAtual(usuario) {
    if (usuario) {
      sessionStorage.setItem(CHAVES_ARMAZENAMENTO.USUARIO_ATUAL, JSON.stringify(usuario));
    } else {
      sessionStorage.removeItem(CHAVES_ARMAZENAMENTO.USUARIO_ATUAL);
    }

    estado.usuarioAtual = usuario;
    sincronizarInterfaceAutenticacao();
  }

  // Lê o usuário logado armazenado na sessão.
  function lerUsuarioAtual() {
    try {
      const armazenado = sessionStorage.getItem(CHAVES_ARMAZENAMENTO.USUARIO_ATUAL);
      return armazenado ? JSON.parse(armazenado) : null;
    } catch (erro) {
      return null;
    }
  }

  // Exibe mensagens de feedback no formulário de login.
  function atualizarAviso(mensagem, estadoAviso) {
    if (!avisoLogin) {
      return;
    }

    avisoLogin.textContent = mensagem;

    if (estadoAviso) {
      avisoLogin.dataset.state = estadoAviso;
    } else {
      delete avisoLogin.dataset.state;
    }
  }

  // Ajusta a visibilidade de um elemento com base em um valor booleano.
  function ajustarVisibilidade(elemento, deveMostrar) {
    elemento.hidden = !deveMostrar;

    if (deveMostrar) {
      elemento.removeAttribute('aria-hidden');
    } else {
      elemento.setAttribute('aria-hidden', 'true');
    }
  }
});