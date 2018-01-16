require 'json'

IMAGE_DIR = 'images/'

manifest = JSON.parse(File.read('manifest.json'), symbolize_names: true)
projects = manifest[:projects]

project_template = '
  <div class="project">
    <a href="{{title_link}}">
      <img class="project-image" src="{{image}}">
      <div class="project-header">
        <h3 class="project-title">{{title}}</h3>
        <div class="project-tag">{{tag}}</div>
      </div>
    </a>
    <div class="project-subtitle">
      <div class="project-links">
        {{subtitles_html}}
      </div>
    </div>
    <div class="project-description">
      {{description_html}}
    </div>
  </div>'

subtitle_template = '
  <a class="project-link" href="{{link}}">{{title}}</a>
'

File.open('./preindex.html', 'r') do |f|
  projects_html = ''

  projects.each do |project|
    template = project_template.dup

    template.gsub!('{{image}}', "#{IMAGE_DIR}#{project[:image]}")
    template.gsub!('{{title}}', project[:title][:name])
    template.gsub!('{{title_link}}', project[:title][:link] || '')

    template.gsub!(
      '{{subtitles_html}}',
      project[:subtitles].map { |s|
        subtitle_template.dup
          .gsub!('{{title}}', s[:name])
          .gsub!('{{link}}', s[:link])
      }.join('&nbsp;&middot;&nbsp;')
    )

    template.gsub!('{{tag}}', project[:tag] || '')

    template.gsub!('{{description_html}}', project[:description_html])

    projects_html += template
  end

  File.write('index.html', f.read.gsub('{{projects}}', projects_html))
end
