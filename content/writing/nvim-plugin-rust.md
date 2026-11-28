---
title: Using Rust in Neovim Plugins
date: 2026-11-27
links:
description: When Lua doesn't cut it, hand off the expensive work to Rust!
tags:
---

Some Neovim plugins need more than just Lua. I'll be talking about when performance matters and when Lua falls short of requirements performance-wise.

I've created two Neovim plugins utilizing Rust for performance-based operations,

- [snapshot.nvim](https://github.com/smit4k/snapshot.nvim)
- [replay.nvim](https://github.com/smit4k/replay.nvim)

Both plugins utilize roughly the same architecture. Lua captures the behavior in Neovim, and exports it to a format that the Rust renderer/generator can act upon.

In **snapshot.nvim**, when you run `:Snapshot`, Lua collects the code and syntax highlighting from Neovim. Rendering the PNG is the expensive part, so I hand off that work to the Rust generator.

## How Lua Talks to Rust

In both plugins, Rust acts as a separate executable. The same approach works for any language that can communicate over [standard streams](https://en.wikipedia.org/wiki/Standard_streams). For computationally expensive operations, moving the processing to Rust can provide significant performance improvements compared to purely using Lua. The overhead of spawning a separate process is generally easier to justify when the process performs substantial work, such as generating an image or rendering a video. However, there is a tradeoff: you have to have a binary to build or distribute.

Here's how **snapshot.nvim** sends the JSON payload:

```lua
local sent, bytes = pcall(vim.fn.chansend, job, json_string)
pcall(vim.fn.chanclose, job, "stdin")
local status = vim.fn.jobwait({ job })[1]
```

Closing the process's stdin with `chanclose` signals end-of-file (EOF), so `read_to_string` can finish and the Rust generator can parse the complete JSON payload.

Here's how Rust takes in the JSON payload:

```rust
fn main() -> Result<()> {
    let mut buffer = String::new();
    io::stdin()
        .read_to_string(&mut buffer)
        .context("Failed to read from stdin")?;

    let input: Input = serde_json::from_str(&buffer).context("Failed to parse JSON input")?;
    generate_image(input)
}
```

## Obtaining the Binary

For my plugins, I set up prebuilt binaries through GitHub Releases.

Each installer picks the asset that matches the version, OS, and architecture.

Here's how it works step by step:

### Choosing a Release Asset

```lua
  local os_name = jit.os:lower() -- "linux", "osx", "windows"
  local arch = jit.arch -- "x64", "arm64"

  -- Map to GitHub release artifact names
  local filename
  if os_name == "linux" and arch == "x64" then
    filename = "snapshot-generator-linux-x86_64"
  elseif os_name == "osx" and arch == "arm64" then
    filename = "snapshot-generator-macos-aarch64"
  elseif os_name == "osx" and arch == "x64" then
    filename = "snapshot-generator-macos-x86_64"
  elseif os_name == "windows" then
    filename = "snapshot-generator-windows-x86_64.exe"
  else
    vim.notify("Unsupported platform: " .. os_name .. " " .. arch, vim.log.levels.ERROR)
    return false
  end

```

### Downloading the Proper Binary

```lua
local dest_dir = release_dir
local dest = generator_path
vim.fn.mkdir(dest_dir, "p")

local url = "https://github.com/smit4k/snapshot.nvim/releases/download/" .. VERSION .. "/" .. filename
local download = dest .. ".download-" .. vim.fn.getpid()
vim.notify("Downloading snapshot generator...", vim.log.levels.INFO)
local downloaded = run_install_command({ "curl", "-fLo", download, url })
if downloaded and not is_windows then
  downloaded = run_install_command({ "chmod", "+x", download }) -- make the downloaded file executable
end
```

### Cargo Build as a Fallback

If the installer can't download or install the release binary, it tries to build the executable locally with `cargo build`.

```lua
  if not downloaded or vim.fn.rename(download, dest) ~= 0 then
    vim.fn.delete(download)
    vim.notify("Download failed, falling back to cargo build...", vim.log.levels.WARN)
    local built, output = run_install_command({
      "cargo",
      "build",
      "--locked",
      "--release",
      "--manifest-path",
      generator_manifest,
      "--target-dir",
      target_dir,
    })
    if not built then
      vim.notify("Cargo build failed: " .. output, vim.log.levels.ERROR)
      return false
    end
  end

```

A separate executable lets me use Rust for the expensive work, and prebuilt releases let the plugin install that executable automatically.
