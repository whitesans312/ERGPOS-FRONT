import React, { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { asistenteService, type FuenteAsistente } from '../services/asistenteService';
import { authService } from '../services/authService';
import './AsistenteChat.css';

type Mensaje = {
    id: number;
    de: 'bot' | 'usuario';
    texto: string;
    fuente?: FuenteAsistente;
};

const fuenteLabel: Record<FuenteAsistente, string> = {
    INTERNO: 'Interno',
    GROQ: 'Groq',
    FALLBACK: 'Ayuda',
    ERROR: 'Error',
};

const renderTexto = (texto: string) => {
    return texto.split('\n').map((linea, lineaIndex) => {
        const partes = linea.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean);

        return (
            <React.Fragment key={`${lineaIndex}-${linea}`}>
                {partes.map((parte, index) => {
                    if (parte.startsWith('**') && parte.endsWith('**')) {
                        return <strong key={index}>{parte.slice(2, -2)}</strong>;
                    }
                    if (parte.startsWith('`') && parte.endsWith('`')) {
                        return <code key={index}>{parte.slice(1, -1)}</code>;
                    }
                    return <React.Fragment key={index}>{parte}</React.Fragment>;
                })}
                {lineaIndex < texto.split('\n').length - 1 && <br />}
            </React.Fragment>
        );
    });
};

const AsistenteChat: React.FC = () => {
    const user = authService.getUser();
    const [abierto, setAbierto] = useState(false);
    const [pregunta, setPregunta] = useState('');
    const [enviando, setEnviando] = useState(false);
    const [mensajes, setMensajes] = useState<Mensaje[]>([
        {
            id: 1,
            de: 'bot',
            texto: 'Hola. Soy el asistente de ERG-INVENTORY. ¿En qué te ayudo hoy?',
            fuente: 'INTERNO',
        },
    ]);
    const scrollRef = useRef<HTMLDivElement>(null);

    if (user?.rol?.nombre !== 'ADMIN') {
        return null;
    }

    useEffect(() => {
        scrollRef.current?.scrollTo({
            top: scrollRef.current.scrollHeight,
            behavior: 'smooth',
        });
    }, [mensajes, enviando, abierto]);

    const enviarPregunta = async (event: FormEvent) => {
        event.preventDefault();
        const texto = pregunta.trim();
        if (!texto || enviando) return;

        const idUsuario = Date.now();
        setPregunta('');
        setEnviando(true);
        setMensajes(prev => [
            ...prev,
            { id: idUsuario, de: 'usuario', texto },
        ]);

        try {
            const respuesta = await asistenteService.preguntar(texto);
            setMensajes(prev => [
                ...prev,
                {
                    id: idUsuario + 1,
                    de: 'bot',
                    texto: respuesta.respuesta,
                    fuente: respuesta.fuente,
                },
            ]);
        } catch {
            setMensajes(prev => [
                ...prev,
                {
                    id: idUsuario + 1,
                    de: 'bot',
                    texto: 'No pude conectar con el asistente en este momento.',
                    fuente: 'ERROR',
                },
            ]);
        } finally {
            setEnviando(false);
        }
    };

    return (
        <div className={`asistente-chat ${abierto ? 'asistente-chat--open' : ''}`}>
            {abierto && (
                <section className="asistente-panel" aria-label="Asistente ERG-INVENTORY">
                    <header className="asistente-header">
                        <div>
                            <h2>Asistente</h2>
                            <span>ERG-INVENTORY</span>
                        </div>
                        <button
                            className="asistente-icon-btn"
                            type="button"
                            onClick={() => setAbierto(false)}
                            aria-label="Cerrar asistente"
                            title="Cerrar"
                        >
                            ×
                        </button>
                    </header>

                    <div className="asistente-mensajes" ref={scrollRef}>
                        {mensajes.map((mensaje) => (
                            <article
                                key={mensaje.id}
                                className={`asistente-mensaje asistente-mensaje--${mensaje.de}`}
                            >
                                <div className="asistente-burbuja">
                                    {renderTexto(mensaje.texto)}
                                </div>
                                {mensaje.fuente && (
                                    <span className={`asistente-fuente asistente-fuente--${mensaje.fuente.toLowerCase()}`}>
                                        {fuenteLabel[mensaje.fuente]}
                                    </span>
                                )}
                            </article>
                        ))}

                        {enviando && (
                            <article className="asistente-mensaje asistente-mensaje--bot">
                                <div className="asistente-burbuja asistente-burbuja--typing">
                                    <span />
                                    <span />
                                    <span />
                                </div>
                            </article>
                        )}
                    </div>

                    <form className="asistente-form" onSubmit={enviarPregunta}>
                        <input
                            value={pregunta}
                            onChange={(event) => setPregunta(event.target.value)}
                            placeholder="Pregunta por ventas, stock, órdenes..."
                            disabled={enviando}
                            maxLength={500}
                        />
                        <button type="submit" disabled={enviando || !pregunta.trim()} aria-label="Enviar pregunta">
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M4 12L20 4L16 20L12 14L4 12Z" />
                            </svg>
                        </button>
                    </form>
                </section>
            )}

            <button
                className="asistente-fab"
                type="button"
                onClick={() => setAbierto(prev => !prev)}
                aria-label={abierto ? 'Cerrar asistente' : 'Abrir asistente'}
                title={abierto ? 'Cerrar asistente' : 'Abrir asistente'}
            >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M5 5H19V15H8L5 18V5Z" />
                    <path d="M8 9H16" />
                    <path d="M8 12H13" />
                </svg>
            </button>
        </div>
    );
};

export default AsistenteChat;
