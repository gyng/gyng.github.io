require 'cgi'
require 'json'

image_directory = "images/"

projects = JSON.parse(File.read('manifest.json'), symbolize_names: true)

project_template = '
  <section class="one-third column project {{alpha_omega_modifier}}">
    <a href="{{title_link}}">
      <img class="project-image" src="{{image}}">
      <h4>{{title}}</h4>
    </a>
    {{subtitles_html}}
    <p>{{description_html}}</p>
  </section>'

subtitle_template = '
  <a href="{{link}}">{{title}}</a>
'

File.open('./preindex.html', 'r') do |f|
  projects_html = ""

  projects.each_with_index do |project, i|
    template = project_template.dup

    # Required for old and outdated skeleton miniframework
    case i % 3
    when 0
      template = "<div class='row'>#{template}"
      template.gsub!("{{alpha_omega_modifier}}", "alpha")
    when 2
      template.gsub!("{{alpha_omega_modifier}}", "omega")
      template = "#{template}</div>"
    end

    template.gsub!("{{image}}", "#{image_directory}#{project[:image]}")
    template.gsub!("{{title}}", project[:title][:name])
    template.gsub!("{{title_link}}", project[:title][:link])

    template.gsub!("{{subtitles_html}}",
      project[:subtitles].map { |s|
        subtitle_template.dup
          .gsub!("{{title}}", s[:name])
          .gsub!("{{link}}", s[:link])
      }.join("&nbsp;&middot;&nbsp;")
    )

    template.gsub!("{{description_html}}", project[:description_html])

    projects_html = projects_html + template
  end

  File.write('index.html', f.read.gsub("{{projects}}", projects_html))
end
