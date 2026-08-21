import os
import re
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler


class RangeRequestHandler(SimpleHTTPRequestHandler):

    def send_head(self):

        # Always initialise this for every request
        self.range = None

        path = self.translate_path(self.path)

        # Let Python handle directories / index.html normally
        if os.path.isdir(path):
            return super().send_head()

        try:
            f = open(path, "rb")

        except OSError:
            self.send_error(404, "File not found")
            return None

        file_size = os.fstat(f.fileno()).st_size
        range_header = self.headers.get("Range")

        # =========================================================
        # NORMAL REQUEST
        # =========================================================

        if not range_header:

            self.send_response(200)

            self.send_header(
                "Content-Type",
                self.guess_type(path)
            )

            self.send_header(
                "Content-Length",
                str(file_size)
            )

            self.send_header(
                "Accept-Ranges",
                "bytes"
            )

            self.end_headers()

            return f

        # =========================================================
        # RANGE REQUEST
        # Example:
        # Range: bytes=0-16383
        # =========================================================

        match = re.match(
            r"bytes=(\d*)-(\d*)",
            range_header
        )

        if not match:

            f.close()

            self.send_error(
                416,
                "Invalid Range"
            )

            return None

        start_text, end_text = match.groups()

        # Suffix range:
        # bytes=-500
        if not start_text and end_text:

            suffix_length = int(end_text)

            start = max(
                file_size - suffix_length,
                0
            )

            end = file_size - 1

        else:

            start = (
                int(start_text)
                if start_text
                else 0
            )

            end = (
                int(end_text)
                if end_text
                else file_size - 1
            )

        # Invalid range
        if start >= file_size or start > end:

            f.close()

            self.send_response(416)

            self.send_header(
                "Content-Range",
                f"bytes */{file_size}"
            )

            self.end_headers()

            return None

        end = min(
            end,
            file_size - 1
        )

        content_length = (
            end - start + 1
        )

        self.send_response(206)

        self.send_header(
            "Content-Type",
            self.guess_type(path)
        )

        self.send_header(
            "Content-Range",
            f"bytes {start}-{end}/{file_size}"
        )

        self.send_header(
            "Content-Length",
            str(content_length)
        )

        self.send_header(
            "Accept-Ranges",
            "bytes"
        )

        self.end_headers()

        f.seek(start)

        self.range = (
            start,
            end
        )

        return f


    def copyfile(
        self,
        source,
        outputfile
    ):

        # Directory/index.html and ordinary requests
        # may not use a byte range.
        byte_range = getattr(
            self,
            "range",
            None
        )

        if byte_range is None:

            try:

                super().copyfile(
                    source,
                    outputfile
                )

            except (
                BrokenPipeError,
                ConnectionResetError,
                ConnectionAbortedError
            ):

                # Browser cancelled a request because
                # the viewport changed, page refreshed, etc.
                pass

            return

        # =========================================================
        # RANGE RESPONSE
        # =========================================================

        start, end = byte_range

        remaining = (
            end - start + 1
        )

        buffer_size = (
            64 * 1024
        )

        while remaining > 0:

            chunk = source.read(
                min(
                    buffer_size,
                    remaining
                )
            )

            if not chunk:
                break

            try:

                outputfile.write(
                    chunk
                )

            except (
                BrokenPipeError,
                ConnectionResetError,
                ConnectionAbortedError
            ):

                # Normal for interactive maps when
                # obsolete tile/range requests are cancelled.
                break

            remaining -= len(chunk)


if __name__ == "__main__":

    port = 8000

    server = ThreadingHTTPServer(
        ("localhost", port),
        RangeRequestHandler
    )

    print(
        f"Range-enabled server: "
        f"http://localhost:{port}"
    )

    print(
        "Press Ctrl+C to stop."
    )

    try:

        server.serve_forever()

    except KeyboardInterrupt:

        print("\nStopping server...")

        server.server_close()