import { useId, useState } from 'react';
import styles from './AuthForm.module.css';

function validateAuthValues(email, password) {
  if (!email) {
    return 'Email is required.';
  }

  if (!email.includes('@')) {
    return 'Enter a valid email address.';
  }

  if (!password) {
    return 'Password is required.';
  }

  return null;
}

export function AuthForm({
  title,
  description,
  submitLabel,
  pendingLabel,
  passwordAutoComplete = 'current-password',
  isSubmitting,
  errorMessage,
  statusMessage,
  statusTone = 'success',
  footer,
  onSubmit,
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [validationMessage, setValidationMessage] = useState('');
  const emailId = useId();
  const passwordId = useId();
  const validationId = useId();
  const errorId = useId();
  const statusId = useId();
  const messageId = validationMessage
    ? validationId
    : errorMessage
      ? errorId
      : statusMessage
        ? statusId
        : undefined;

  async function handleSubmit(event) {
    event.preventDefault();

    const nextEmail = email.trim();
    const nextValidationMessage = validateAuthValues(nextEmail, password);

    if (nextValidationMessage) {
      setValidationMessage(nextValidationMessage);
      return;
    }

    setValidationMessage('');
    await onSubmit({
      email: nextEmail,
      password,
    });
  }

  function handleEmailChange(event) {
    setEmail(event.target.value);

    if (validationMessage) {
      setValidationMessage('');
    }
  }

  function handlePasswordChange(event) {
    setPassword(event.target.value);

    if (validationMessage) {
      setValidationMessage('');
    }
  }

  return (
    <main className={styles.authForm}>
      <section className={styles.authForm__card}>
        <header className={styles.authForm__header}>
          <p className={styles.authForm__eyebrow}>Personal OS</p>
          <h1 className={styles.authForm__title}>{title}</h1>
          <p className={styles.authForm__description}>{description}</p>
        </header>

        {validationMessage ? (
          <p
            className={`${styles.authForm__message} ${styles['authForm__message--error']}`}
            id={validationId}
            role="alert"
          >
            {validationMessage}
          </p>
        ) : null}

        {errorMessage ? (
          <p
            className={`${styles.authForm__message} ${styles['authForm__message--error']}`}
            id={errorId}
            role="alert"
          >
            {errorMessage}
          </p>
        ) : null}

        {statusMessage ? (
          <p
            className={`${styles.authForm__message} ${styles[`authForm__message--${statusTone}`]}`}
            id={statusId}
            role="status"
          >
            {statusMessage}
          </p>
        ) : null}

        <form className={styles.authForm__form} onSubmit={handleSubmit}>
          <label className={styles.authForm__field} htmlFor={emailId}>
            <span className={styles.authForm__label}>Email</span>
            <input
              autoComplete="email"
              className={styles.authForm__input}
              id={emailId}
              name="email"
              onChange={handleEmailChange}
              placeholder="you@example.com"
              type="email"
              value={email}
            />
          </label>

          <label className={styles.authForm__field} htmlFor={passwordId}>
            <span className={styles.authForm__label}>Password</span>
            <input
              aria-describedby={messageId}
              aria-invalid={Boolean(validationMessage || errorMessage)}
              autoComplete={passwordAutoComplete}
              className={styles.authForm__input}
              id={passwordId}
              name="password"
              onChange={handlePasswordChange}
              placeholder="Enter your password"
              type="password"
              value={password}
            />
          </label>

          <button
            className={styles.authForm__submit}
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? pendingLabel : submitLabel}
          </button>
        </form>

        {footer ? <footer className={styles.authForm__footer}>{footer}</footer> : null}
      </section>
    </main>
  );
}
