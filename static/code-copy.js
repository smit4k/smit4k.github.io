const copiedLabel = "copied";
const defaultLabel = "copy";

function resetButton(button) {
    button.textContent = defaultLabel;
    button.removeAttribute("data-copied");
}

async function copyText(text) {
    if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return;
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.top = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
}

function wrapCodeBlocks(container) {
    container.querySelectorAll("pre").forEach((pre) => {
        if (pre.closest(".code-block") || !pre.querySelector("code")) {
            return;
        }

        const wrapper = document.createElement("div");
        wrapper.className = "code-block";

        const button = document.createElement("button");
        button.className = "code-copy-button";
        button.type = "button";
        button.setAttribute("aria-label", "Copy code to clipboard");
        button.textContent = defaultLabel;

        pre.before(wrapper);
        wrapper.append(button, pre);
    });
}

function installCodeBlockCopy(container) {
    const timeouts = new WeakMap();

    const onClick = async (event) => {
        const target = event.target;
        if (!(target instanceof Element)) {
            return;
        }

        const button = target.closest(".code-copy-button");
        if (!(button instanceof HTMLButtonElement) || !container.contains(button)) {
            return;
        }

        const codeBlock = button.closest(".code-block");
        const code = codeBlock?.querySelector("pre code");
        const text = code?.textContent;

        if (!text) {
            return;
        }

        await copyText(text);

        const existingTimeout = timeouts.get(button);
        if (existingTimeout) {
            window.clearTimeout(existingTimeout);
        }

        button.textContent = copiedLabel;
        button.setAttribute("data-copied", "true");
        timeouts.set(button, window.setTimeout(() => resetButton(button), 1600));
    };

    container.addEventListener("click", onClick);
}

wrapCodeBlocks(document);
installCodeBlockCopy(document);
