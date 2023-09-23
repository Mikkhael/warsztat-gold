use std::io::{BufWriter, Write, BufReader, BufRead};
use std::path::Path;
// use encoding_rs::WINDOWS_1250;
use oem_cp;

pub fn encode_file(path_in: &Path, path_out: &Path) -> std::io::Result<()>{
    let file_in  = std::fs::OpenOptions::new().read(true).open(path_in)?;
    let file_out = std::fs::OpenOptions::new().write(true).truncate(true).create(true).open(path_out)?;

    let buf_in      = BufReader::new(file_in);
    let mut buf_out = BufWriter::new(file_out);

    for line in buf_in.lines() {
        let line = line?;
        // let (enc_line, _, _) = WINDOWS_1250.encode(&line);
        let enc_line = oem_cp::encode_string_lossy(line, &oem_cp::code_table::ENCODING_TABLE_CP852);
        buf_out.write_all(&enc_line)?;
        write!(&mut buf_out, "\r\n")?;
    }

    Ok(())
}